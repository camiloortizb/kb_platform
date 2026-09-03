import io
import os
import json
import hashlib
import shutil
import logging
from typing import List, Tuple, Optional, Dict, Any
from PIL import Image, ImageStat, UnidentifiedImageError

from .models import ImageSlice

logger = logging.getLogger('kbeauty_crawler.image_slicer')

# Guard against decompression bomb vulnerabilities while allowing large cosmetic banners
Image.MAX_IMAGE_PIXELS = 150_000_000


class ImageCache:
    """
    Multi-tier Content-Addressable SHA-256 disk cache for preprocessed image slices.
    Includes LRU pruning to prevent unbounded disk growth.
    """
    def __init__(self, cache_dir: str = ".cache/kbeauty_images", max_cache_size_mb: int = 1024):
        self.cache_dir = cache_dir
        self.max_cache_size_bytes = max_cache_size_mb * 1024 * 1024
        os.makedirs(self.cache_dir, exist_ok=True)

    def _get_cache_path(self, key_hash: str) -> str:
        prefix = key_hash[:2]
        return os.path.join(self.cache_dir, prefix, key_hash)

    def get_slices(self, key_hash: str) -> Optional[List[ImageSlice]]:
        """Retrieve pre-sliced ImageSlice objects from disk cache if hit."""
        cache_path = self._get_cache_path(key_hash)
        meta_path = os.path.join(cache_path, "meta.json")

        if not os.path.exists(meta_path):
            return None

        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)

            # Touch meta to update access time for LRU
            os.utime(meta_path, None)

            slices = []
            for item in meta.get("slices", []):
                slice_filename = item["filename"]
                slice_path = os.path.join(cache_path, slice_filename)
                if not os.path.exists(slice_path):
                    return None
                with open(slice_path, "rb") as sf:
                    slice_bytes = sf.read()

                slice_obj = ImageSlice(
                    slice_index=item["slice_index"],
                    total_slices=item["total_slices"],
                    bbox=tuple(item["bbox"]),
                    width=item["width"],
                    height=item["height"],
                    overlap_top_px=item.get("overlap_top_px", 0),
                    overlap_bottom_px=item.get("overlap_bottom_px", 0),
                    image_bytes=slice_bytes,
                    mime_type="image/jpeg",
                    source_url=item.get("source_url", ""),
                    sha256=item.get("sha256", hashlib.sha256(slice_bytes).hexdigest()),
                )
                slices.append(slice_obj)

            return slices if slices else None
        except Exception as e:
            logger.warning(f"Failed to load cached slices for {key_hash}: {e}")
            return None

    def save_slices(self, key_hash: str, slices: List[ImageSlice], meta: Dict[str, Any]) -> None:
        """Persist generated ImageSlice objects and metadata to content-addressable cache."""
        try:
            cache_path = self._get_cache_path(key_hash)
            os.makedirs(cache_path, exist_ok=True)

            slices_meta = []
            for s in slices:
                filename = f"slice_{s.slice_index:02d}.jpg"
                file_path = os.path.join(cache_path, filename)
                with open(file_path, "wb") as sf:
                    sf.write(s.image_bytes)

                slices_meta.append({
                    "slice_index": s.slice_index,
                    "total_slices": s.total_slices,
                    "bbox": list(s.bbox),
                    "width": s.width,
                    "height": s.height,
                    "overlap_top_px": s.overlap_top_px,
                    "overlap_bottom_px": s.overlap_bottom_px,
                    "filename": filename,
                    "source_url": s.source_url,
                    "sha256": s.sha256,
                })

            meta_record = {
                "key_hash": key_hash,
                "created_at": meta.get("created_at"),
                "source_url": meta.get("source_url", ""),
                "original_width": meta.get("original_width"),
                "original_height": meta.get("original_height"),
                "normalized_width": meta.get("normalized_width"),
                "normalized_height": meta.get("normalized_height"),
                "num_slices": len(slices),
                "slices": slices_meta,
            }

            meta_path = os.path.join(cache_path, "meta.json")
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(meta_record, f, indent=2, ensure_ascii=False)

            self._prune_lru()
        except Exception as e:
            logger.warning(f"Failed to save cached slices for {key_hash}: {e}")

    def _prune_lru(self) -> None:
        """Prune oldest cache entries if total disk footprint exceeds max_cache_size_bytes."""
        try:
            entries = []
            total_size = 0

            for root, dirs, files in os.walk(self.cache_dir):
                if "meta.json" in files:
                    meta_path = os.path.join(root, "meta.json")
                    dir_size = sum(os.path.getsize(os.path.join(root, f)) for f in files)
                    mtime = os.path.getmtime(meta_path)
                    entries.append((mtime, root, dir_size))
                    total_size += dir_size

            if total_size > self.max_cache_size_bytes:
                # Sort by last modification time (oldest first)
                entries.sort(key=lambda x: x[0])
                for _, folder_path, dir_size in entries:
                    if total_size <= self.max_cache_size_bytes:
                        break
                    shutil.rmtree(folder_path, ignore_errors=True)
                    total_size -= dir_size
        except Exception as e:
            logger.warning(f"Error during cache LRU pruning: {e}")


class ImageSlicer:
    """
    Intelligent vertical image slicer designed for tall Korean cosmetic banners.
    Features:
    - RGBA / Transparent PNG normalization to clean RGB white canvas.
    - Responsive width normalization with Lanczos resampling.
    - Seam carving / whitespace row-variance gutter snapping.
    - Overlapping slice generation to preserve typography across boundaries.
    - Content-addressable SHA-256 caching.
    """
    def __init__(
        self,
        slice_height: int = 1500,
        overlap: int = 150,
        min_tail_height: int = 250,
        target_width: int = 1000,
        max_width: int = 1200,
        min_width: int = 600,
        jpeg_quality: int = 85,
        enable_gutter_snapping: bool = True,
        gutter_search_window: int = 60,
        cache_dir: Optional[str] = ".cache/kbeauty_images",
    ):
        self.slice_height = slice_height
        self.overlap = overlap
        self.min_tail_height = min_tail_height
        self.target_width = target_width
        self.max_width = max_width
        self.min_width = min_width
        self.jpeg_quality = jpeg_quality
        self.enable_gutter_snapping = enable_gutter_snapping
        self.gutter_search_window = gutter_search_window
        self.cache = ImageCache(cache_dir=cache_dir) if cache_dir else None

    def normalize_image(self, img: Image.Image) -> Image.Image:
        """
        Flattens transparent alpha layers over a pure white canvas (255, 255, 255)
        and normalizes banner width.
        """
        # 1. Alpha normalization
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            converted = img.convert("RGBA")
            alpha = converted.split()[-1]
            bg.paste(converted, mask=alpha)
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # 2. Width normalization
        w, h = img.size
        if w > self.max_width:
            new_w = self.target_width
            new_h = int(round(h * (new_w / float(w))))
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        elif w < self.min_width and h > self.slice_height:
            new_w = max(self.min_width, 800)
            new_h = int(round(h * (new_w / float(w))))
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        return img

    def find_optimal_gutter_split(self, img: Image.Image, nominal_cut: int) -> int:
        """
        Search window [nominal_cut - delta, nominal_cut + delta] for the horizontal row
        with minimum luminance variance (representing uniform whitespace/background gutter).
        """
        w, h = img.size
        delta = self.gutter_search_window
        y_min = max(10, nominal_cut - delta)
        y_max = min(h - 10, nominal_cut + delta)

        if y_min >= y_max:
            return nominal_cut

        best_y = nominal_cut
        best_score = float("inf")

        # Convert crop to grayscale for fast row variance calculation
        search_crop = img.crop((0, y_min, w, y_max)).convert("L")
        crop_w, crop_h = search_crop.size

        # Sample rows every 2 pixels
        step_x = max(1, crop_w // 50)
        for rel_y in range(0, crop_h, 2):
            actual_y = y_min + rel_y
            row_pixels = [search_crop.getpixel((x, rel_y)) for x in range(0, crop_w, step_x)]
            if not row_pixels:
                continue

            mean = sum(row_pixels) / len(row_pixels)
            variance = sum((p - mean) ** 2 for p in row_pixels) / len(row_pixels)

            # Heuristic: penalize distance from nominal cut point
            distance_penalty = 0.05 * abs(actual_y - nominal_cut)
            score = variance + distance_penalty

            if score < best_score:
                best_score = score
                best_y = actual_y

        return best_y

    def slice_image_bytes(self, raw_bytes: bytes, source_url: str = "") -> List[ImageSlice]:
        """
        Processes raw banner bytes:
        1. Checks content-addressable cache.
        2. Normalizes color channels and width.
        3. Computes overlapping slices with gutter snapping and tail absorption.
        4. Compresses chunks to optimized JPEGs.
        5. Returns structured ImageSlice list.
        """
        if not raw_bytes:
            return []

        raw_sha256 = hashlib.sha256(raw_bytes).hexdigest()

        # Check cache
        if self.cache:
            cached_slices = self.cache.get_slices(raw_sha256)
            if cached_slices is not None:
                return cached_slices

        try:
            with Image.open(io.BytesIO(raw_bytes)) as raw_img:
                orig_w, orig_h = raw_img.size
                norm_img = self.normalize_image(raw_img)
        except (UnidentifiedImageError, Exception) as e:
            logger.error(f"Failed to open/normalize image bytes ({len(raw_bytes)} bytes): {e}")
            return []

        width, height = norm_img.size

        # Case 1: Image fits inside a single slice
        if height <= self.slice_height:
            buf = io.BytesIO()
            norm_img.save(buf, format="JPEG", quality=self.jpeg_quality, optimize=True, subsampling=0)
            slice_bytes = buf.getvalue()
            single_slice = ImageSlice(
                slice_index=0,
                total_slices=1,
                bbox=(0, 0, width, height),
                width=width,
                height=height,
                overlap_top_px=0,
                overlap_bottom_px=0,
                image_bytes=slice_bytes,
                mime_type="image/jpeg",
                source_url=source_url,
                sha256=hashlib.sha256(slice_bytes).hexdigest(),
            )
            slices = [single_slice]
            if self.cache:
                self.cache.save_slices(
                    raw_sha256,
                    slices,
                    {
                        "source_url": source_url,
                        "original_width": orig_w,
                        "original_height": orig_h,
                        "normalized_width": width,
                        "normalized_height": height,
                    }
                )
            return slices

        # Case 2: Multi-slice vertical chunking
        raw_crops: List[Tuple[int, int, int, int]] = []
        y_top = 0

        while y_top < height:
            nominal_bottom = min(height, y_top + self.slice_height)

            if nominal_bottom >= height:
                y_bottom = height
            elif self.enable_gutter_snapping:
                y_bottom = self.find_optimal_gutter_split(norm_img, nominal_bottom)
            else:
                y_bottom = nominal_bottom

            # Tail absorption: avoid leaving tiny residual slice
            if height - y_bottom < self.min_tail_height and y_bottom < height:
                y_bottom = height

            raw_crops.append((0, y_top, width, y_bottom))

            if y_bottom >= height:
                break

            # Advance y_top for next slice with overlap
            y_top = max(y_top + 1, y_bottom - self.overlap)

        # Build ImageSlice objects
        total_slices = len(raw_crops)
        slices: List[ImageSlice] = []

        for idx, (left, top, right, bottom) in enumerate(raw_crops):
            crop_img = norm_img.crop((left, top, right, bottom))
            buf = io.BytesIO()
            crop_img.save(buf, format="JPEG", quality=self.jpeg_quality, optimize=True, subsampling=0)
            chunk_bytes = buf.getvalue()

            # Overlap calculations
            overlap_top = 0
            if idx > 0:
                prev_bottom = raw_crops[idx - 1][3]
                overlap_top = max(0, prev_bottom - top)

            overlap_bottom = 0
            if idx < total_slices - 1:
                next_top = raw_crops[idx + 1][1]
                overlap_bottom = max(0, bottom - next_top)

            slice_item = ImageSlice(
                slice_index=idx,
                total_slices=total_slices,
                bbox=(left, top, right, bottom),
                width=right - left,
                height=bottom - top,
                overlap_top_px=overlap_top,
                overlap_bottom_px=overlap_bottom,
                image_bytes=chunk_bytes,
                mime_type="image/jpeg",
                source_url=source_url,
                sha256=hashlib.sha256(chunk_bytes).hexdigest(),
            )
            slices.append(slice_item)

        # Save to cache
        if self.cache:
            self.cache.save_slices(
                raw_sha256,
                slices,
                {
                    "source_url": source_url,
                    "original_width": orig_w,
                    "original_height": orig_h,
                    "normalized_width": width,
                    "normalized_height": height,
                }
            )

        return slices
