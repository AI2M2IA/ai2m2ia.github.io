#!/usr/bin/env python3
import os
import json
import shutil
import re
import argparse
from datetime import datetime, timezone

DEFAULT_WORKSPACE = os.environ.get("AI2M2IA_WORKSPACE", "/Volumes/WORK/projects")
DEFAULT_BASE_URL = os.environ.get("AI2M2IA_API_BASE_URL", "https://ai2m2ia.github.io")
DEFAULT_API_PREFIX = os.environ.get("AI2M2IA_API_PREFIX", "/api")
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_DIR = os.path.dirname(os.path.dirname(PROJECT_DIR))
SCHEMAS_DIR = os.path.join(PROJECT_DIR, "schemas")
DEFAULT_OUT_DIR = os.environ.get("AI2M2IA_API_OUT_DIR", os.path.join(REPO_DIR, "api"))
SCHEMA_VERSION = 1

# Roman numerals mapping
ROMAN = {
    1: "I", 2: "II", 3: "III", 4: "IV", 5: "V",
    6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X",
    11: "XI", 12: "XII", 13: "XIII", 14: "XIV", 15: "XV",
    16: "XVI", 17: "XVII", 18: "XVIII", 19: "XIX", 20: "XX",
    21: "XXI", 22: "XXII", 23: "XXIII", 24: "XXIV", 25: "XXV",
    26: "XXVI", 27: "XXVII", 28: "XXVIII", 29: "XXIX", 30: "XXX"
}

# Subtitles mapping for "The Last Archive" (1-30)
LAST_ARCHIVE_SUBTITLES = {
    1: "The Echo That Wouldn't Fade",
    2: "The Frequencies Between",
    3: "The Branded Heretic",
    4: "Flight",
    5: "Unwoven Society",
    6: "The Null",
    7: "Act I Finale",
    8: "Into the Unwoven",
    9: "The Deepening Conspiracy",
    10: "The Cost of Intelligence",
    11: "Fractures",
    12: "Hidden Costs",
    13: "Convergence",
    14: "The Turning Point",
    15: "Into the Layer",
    16: "The Layer Deepens",
    17: "The Cost of Contact",
    18: "Resonance Core",
    19: "Institutional Conflict",
    20: "The Catalogue Zero",
    21: "The Cost of Transition",
    22: "The Warning",
    23: "Unified Resistance",
    24: "Conflicting Records",
    25: "Parallel Lines",
    26: "The Gathering Storm",
    27: "Last Opening",
    28: "The Fragile Present",
    29: "Protection",
    30: "Preservation"
}

def parse_simple_yaml(filepath):
    """Parses a simple YAML frontmatter from a markdown file or metadata yaml."""
    metadata = {}
    if not os.path.exists(filepath):
        return metadata
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Try finding yaml block between ---
    match = re.search(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    yaml_text = match.group(1) if match else content
    
    # Parse key value pairs
    for line in yaml_text.split('\n'):
        line = line.strip()
        if not line or line.startswith('#') or ':' not in line:
            continue
        key, val = line.split(':', 1)
        key = key.strip()
        val = val.strip()
        # Remove surrounding quotes
        if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
            val = val[1:-1]
        metadata[key] = val
        
    return metadata

def clean_markdown_chapter(text):
    """Extracts the title (first # line) and clean text (without that # line) from chapter."""
    lines = text.split('\n')
    title = "Untitled Chapter"
    clean_lines = []
    found_title = False
    
    for line in lines:
        if not found_title and line.startswith('# '):
            title = line[2:].strip()
            # Clean title if it contains markdown formatting
            title = re.sub(r'[\*\_]', '', title)
            found_title = True
        else:
            clean_lines.append(line)
            
    return title, '\n'.join(clean_lines).strip()

def absolute_url(base_url, path):
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"

def api_path(api_prefix, path):
    return f"{api_prefix.strip('/')}/{path.lstrip('/')}"

def build_content_manifest(book_id, book_format, chapters, generated_at, language="en"):
    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": generated_at,
        "bookId": book_id,
        "format": book_format,
        "language": language,
        "revision": generated_at[:10],
        "chapters": chapters
    }

def copy_schemas(api_out_dir):
    if not os.path.isdir(SCHEMAS_DIR):
        return
    target_dir = os.path.join(api_out_dir, "schemas")
    os.makedirs(target_dir, exist_ok=True)
    for filename in os.listdir(SCHEMAS_DIR):
        if filename.endswith(".json"):
            shutil.copy2(os.path.join(SCHEMAS_DIR, filename), os.path.join(target_dir, filename))

def process_aws_book(aws_book_dir, books_out_dir, base_url, api_prefix, generated_at):
    """Processes 'Let's Build on AWS Together' book."""
    print("Processing AWS Book...")
    book_id = "lets-learn-aws-together"
    book_out_dir = os.path.join(books_out_dir, book_id)
    os.makedirs(book_out_dir, exist_ok=True)
    
    # 1. Parse metadata
    metadata_path = os.path.join(aws_book_dir, "assets", "metadata.yaml")
    meta = parse_simple_yaml(metadata_path)
    
    title = meta.get("title", "Let's Build on AWS Together")
    description = meta.get("description", "AWS That Actually Makes Sense.")
    author = meta.get("author", "Anna B. Fiore")
    
    # 2. Parse chapters
    chapters = []
    chapters_dir = os.path.join(aws_book_dir, "chapters")
    if os.path.exists(chapters_dir):
        # Sort directories numerically
        dirs = sorted([d for d in os.listdir(chapters_dir) if os.path.isdir(os.path.join(chapters_dir, d))])
        for idx, dir_name in enumerate(dirs):
            ch_file = os.path.join(chapters_dir, dir_name, "chapter.md")
            if os.path.exists(ch_file):
                with open(ch_file, 'r', encoding='utf-8') as f:
                    ch_content = f.read()
                ch_title, ch_text = clean_markdown_chapter(ch_content)
                # If title starts with Chapter X:, let's standardise it
                chapters.append({
                    "index": idx,
                    "title": ch_title,
                    "text": ch_text,
                    "images": []
                })
                print(f"  Added chapter {idx}: {ch_title}")
                
    # 3. Save content manifest
    content_manifest = build_content_manifest(book_id, "PROSE", chapters, generated_at)
    with open(os.path.join(book_out_dir, "content.json"), 'w', encoding='utf-8') as f:
        json.dump(content_manifest, f, indent=2, ensure_ascii=False)
        
    # 4. Copy cover
    src_cover = os.path.join(aws_book_dir, "build", "kdp", "cover.jpg")
    dest_cover = os.path.join(book_out_dir, "cover.jpg")
    if os.path.exists(src_cover):
        shutil.copy2(src_cover, dest_cover)
    else:
        # Fallback to copy from assets if exists
        fallback = os.path.join(aws_book_dir, "assets", "cover", "cover.jpg")
        if os.path.exists(fallback):
            shutil.copy2(fallback, dest_cover)
        else:
            print("  Warning: No cover image found for AWS book.")
            
    # 5. Return catalog entry
    return {
        "id": book_id,
        "title": title,
        "format": "PROSE",
        "manifestUrl": absolute_url(base_url, api_path(api_prefix, f"books/{book_id}/content.json")),
        "languages": ["en"],
        "author": author,
        "coverUrl": absolute_url(base_url, api_path(api_prefix, f"books/{book_id}/cover.jpg")),
        "description": description,
        "links": {
            "amazonKindleUrl": "https://www.amazon.com/dp/B0D5WSMD8D" # Placeholder or standard link if exists
        }
    }

def process_last_archive(last_archive_dir, books_out_dir, base_url, api_prefix, generated_at):
    """Processes 'The Last Archive' 30 volumes."""
    print("Processing The Last Archive volumes...")
    catalog_entries = []
    manuscripts_dir = os.path.join(last_archive_dir, "manuscripts")
    
    if not os.path.exists(manuscripts_dir):
        print("  Error: Manuscripts directory not found.")
        return catalog_entries
        
    # Process volumes 1 to 30
    for vol_num in range(1, 31):
        vol_str = f"{vol_num:03d}"
        vol_dir = os.path.join(manuscripts_dir, f"vol-{vol_str}")
        
        if not os.path.exists(vol_dir):
            continue
            
        print(f"  Processing Volume {vol_num}...")
        book_id = f"the-last-archive-vol-{vol_str}"
        book_out_dir = os.path.join(books_out_dir, book_id)
        os.makedirs(book_out_dir, exist_ok=True)
        
        # 1. Subtitle & Description
        sub = LAST_ARCHIVE_SUBTITLES.get(vol_num, f"Volume {ROMAN[vol_num]}")
        vol_title = f"The Last Archive: Volume {ROMAN[vol_num]} — {sub}"
        
        description = f"Volume {ROMAN[vol_num]} of 'The Last Archive', a 30-volume speculative fiction novel series by AI(2)M(2)IA exploring Chronometry, timelines, and the cost of human choice."
        
        # 2. Parse chapters
        chapters = []
        # List all ch-*.md files
        ch_files = sorted([f for f in os.listdir(vol_dir) if f.startswith("ch-") and f.endswith(".md")])
        for ch_file in ch_files:
            # Extract chapter index
            ch_match = re.search(r'ch-(\d+)', ch_file)
            if not ch_match:
                continue
            ch_idx = int(ch_match.group(1))
            
            filepath = os.path.join(vol_dir, ch_file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            ch_title, ch_text = clean_markdown_chapter(content)
            chapters.append({
                "index": ch_idx,
                "title": ch_title,
                "text": ch_text,
                "images": []
            })
            
        # 3. Save content manifest
        content_manifest = build_content_manifest(book_id, "PROSE", chapters, generated_at)
        with open(os.path.join(book_out_dir, "content.json"), 'w', encoding='utf-8') as f:
            json.dump(content_manifest, f, indent=2, ensure_ascii=False)
            
        # 4. Copy cover
        src_cover_dir = os.path.join(last_archive_dir, "covers", f"vol-{vol_str}")
        dest_cover = os.path.join(book_out_dir, "cover.jpg")
        copied_cover = False
        
        if os.path.exists(src_cover_dir):
            for ext in [".jpg", ".png"]:
                src_cover_file = os.path.join(src_cover_dir, f"cover{ext}")
                if os.path.exists(src_cover_file):
                    shutil.copy2(src_cover_file, dest_cover)
                    copied_cover = True
                    break
        
        # If no cover image exists, we write a note in console.
        # The frontend will render a gorgeous fallback CSS cover using the volume number and title.
        if not copied_cover:
            # We don't write anything, the frontend will dynamically render it
            pass
            
        # 5. Add catalog entry
        catalog_entries.append({
            "id": book_id,
            "title": vol_title,
            "format": "PROSE",
            "manifestUrl": absolute_url(base_url, api_path(api_prefix, f"books/{book_id}/content.json")),
            "languages": ["en"],
            "author": "AI(2)M(2)IA",
            "coverUrl": absolute_url(base_url, api_path(api_prefix, f"books/{book_id}/cover.jpg")) if copied_cover else None,
            "description": description,
            "links": {
                "youtubeTrailerUrl": None,
                "tiktokSampleUrl": None,
                "amazonKindleUrl": None
            }
        })
        
    return catalog_entries

def parse_args():
    parser = argparse.ArgumentParser(description="Build the AI(2)M(2)IA static book API.")
    parser.add_argument("--aws-book-dir", default=os.path.join(DEFAULT_WORKSPACE, "lets-learn-aws-together"))
    parser.add_argument("--last-archive-dir", default=os.path.join(DEFAULT_WORKSPACE, "teste"))
    parser.add_argument("--out-dir", default=DEFAULT_OUT_DIR)
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--api-prefix", default=DEFAULT_API_PREFIX)
    parser.add_argument("--generated-at", default=datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"))
    return parser.parse_args()

def main():
    args = parse_args()
    api_out_dir = args.out_dir
    books_out_dir = os.path.join(api_out_dir, "books")
    os.makedirs(books_out_dir, exist_ok=True)
    copy_schemas(api_out_dir)

    catalog = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": args.generated_at,
        "apiBaseUrl": args.base_url.rstrip("/"),
        "apiPrefix": "/" + args.api_prefix.strip("/"),
        "books": []
    }
    
    # Process AWS Book
    try:
        aws_entry = process_aws_book(args.aws_book_dir, books_out_dir, args.base_url, args.api_prefix, args.generated_at)
        catalog["books"].append(aws_entry)
    except Exception as e:
        print(f"Error processing AWS book: {e}")
        
    # Process The Last Archive volumes
    try:
        la_entries = process_last_archive(args.last_archive_dir, books_out_dir, args.base_url, args.api_prefix, args.generated_at)
        catalog["books"].extend(la_entries)
    except Exception as e:
        print(f"Error processing The Last Archive: {e}")
        
    # Save catalog
    catalog_path = os.path.join(api_out_dir, "catalog.json")
    with open(catalog_path, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
        
    print(f"Catalog saved with {len(catalog['books'])} books to: {catalog_path}")

if __name__ == "__main__":
    main()
