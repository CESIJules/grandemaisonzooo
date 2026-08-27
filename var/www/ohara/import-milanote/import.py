import os
import re
import sys
import json
import uuid
import time
import zipfile
import urllib.parse
import sqlite3

# Ensure safe printing of emojis
sys.stdout.reconfigure(encoding='utf-8')

# Paths
script_dir = os.path.dirname(os.path.abspath(__file__))
import_dir = script_dir
md_path = os.path.join(import_dir, "gm-260826_0107.md")

# Determine DB Path and Uploads Path based on environment
is_server = os.path.exists("/var/www/ohara")
if is_server:
    db_path = "/var/www/ohara/.data/sqlite.db"
    uploads_dir = "/var/www/html/uploads/ohara"
else:
    local_dir = os.path.dirname(script_dir)
    db_path = os.path.join(local_dir, ".data", "sqlite.db")
    uploads_dir = os.path.join(local_dir, "uploads", "ohara")

print(f"Running import script. Server mode: {is_server}")
print(f"Database path: {db_path}")
print(f"Uploads path: {uploads_dir}")

# Ensure uploads directory exists
os.makedirs(uploads_dir, exist_ok=True)

# 1. Unzip all archives to uploads directory
print("\n--- 1. Unzipping Milanote archives ---")
zip_files = [f for f in os.listdir(import_dir) if f.endswith(".zip")]
extracted_files = {}

for zf in zip_files:
    zip_path = os.path.join(import_dir, zf)
    print(f"Extracting {zf}...")
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            for member in zip_ref.infolist():
                filename = os.path.basename(member.filename)
                if not filename:
                    continue
                decoded_name = urllib.parse.unquote(filename)
                target_path = os.path.join(uploads_dir, decoded_name)
                
                with zip_ref.open(member) as source, open(target_path, "wb") as target:
                    target.write(source.read())
                
                extracted_files[decoded_name.lower()] = decoded_name
                print(f"  Extracted: {decoded_name}")
    except Exception as e:
        print(f"  Error extracting {zf}: {e}")

print(f"Total extracted assets: {len(extracted_files)}")

# 2. Connect to SQLite and Clear Old Import
print("\n--- 2. Connecting to SQLite and clearing old tables ---")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Clear existing tables for clean import
print("Clearing transactional tables...")
cursor.execute("DELETE FROM task_tags")
cursor.execute("DELETE FROM tasks")
cursor.execute("DELETE FROM calendar_events")
cursor.execute("DELETE FROM kanban_cards")
cursor.execute("DELETE FROM kanban_columns")
cursor.execute("DELETE FROM project_tags")
cursor.execute("DELETE FROM blocks")
cursor.execute("DELETE FROM projects")
cursor.execute("DELETE FROM categories")
cursor.execute("DELETE FROM tags")

# Get first user as owner
cursor.execute("SELECT id, name FROM users LIMIT 1")
user_row = cursor.fetchone()
if not user_row:
    owner_id = str(uuid.uuid4())
    now_str = "2026-08-26T03:00:00.000Z"
    cursor.execute(
        "INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (owner_id, "admin@grandemaisonzoo.com", "$2b$12$lKgtmcEYAMyw9kkTtSEUCO6rDGYOkVgGzoMl4buaMVxhF16PTbsS2", "admin", "admin", now_str)
    )
    print("Created default admin user.")
else:
    owner_id = user_row[0]
    print(f"Owner assigned: {user_row[1]} ({owner_id})")

# Setup 6 Categories
target_categories = {
    "🎙️ Studio & Artistes": "#ec4899",
    "💿 Sorties & Collabs": "#f97316",
    "🔌 Boutique & VST": "#3b82f6",
    "🏢 Label & Structure": "#8b5cf6",
    "🌐 Tech & Infrastructure": "#06b6d4",
    "🛫 Lab d'Idées & Voyages": "#10b981"
}

category_ids = {}
for name, color in target_categories.items():
    cursor.execute("SELECT id FROM categories WHERE name = ?", (name,))
    cat_row = cursor.fetchone()
    if cat_row:
        category_ids[name] = cat_row[0]
    else:
        cat_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO categories (id, name, color, description, created_at) VALUES (?, ?, ?, ?, ?)",
            (cat_id, name, color, f"Espace {name}", int(time.time()))
        )
        category_ids[name] = cat_id
        print(f"Created category: {name}")

conn.commit()

# Helper: Match file links to extracted files
def resolve_file_url(url_or_filename):
    decoded = urllib.parse.unquote(url_or_filename)
    basename = os.path.basename(decoded).split('?')[0]
    basename_lower = basename.lower()
    
    if basename_lower in extracted_files:
        actual_name = extracted_files[basename_lower]
        return f"/uploads/ohara/{actual_name}", actual_name
    
    for key, val in extracted_files.items():
        if key in basename_lower or basename_lower in key:
            return f"/uploads/ohara/{val}", val
            
    return url_or_filename, basename

# 3. Parse gm-260826_0107.md
print("\n--- 3. Parsing gm-260826_0107.md ---")
with open(md_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

pages_data = []
current_livre = None
current_parent_page = None
current_page = None
current_category = None
current_lines = []

active_group = None

for line in lines:
    stripped = line.strip()
    
    # Context groups
    if line.startswith("## PROJET MAGE"):
        active_group = "Mage"
    elif line.startswith("## PROJETS NN"):
        active_group = "Nelson North"
    elif line.startswith("## PROJETS REQ1"):
        active_group = "REQ1"
    elif line.startswith("## PROJETS SHOREBREAK"):
        active_group = "Shorebreak"
    elif line.startswith("## PROJETS GRANDEMAISON"):
        active_group = "Grande Maison"
    elif line.startswith("# ALAMERCOMMEALAMER"):
        active_group = "A La Mer Comme A La Mer"
    elif line.startswith("# SITE"):
        active_group = "Site & Infrastructure"
    elif line.startswith("# VST/PLUGIN"):
        active_group = "VST & Plugins"
    elif line.startswith("# EXP/JEU"):
        active_group = "Exp / Jeu"
    elif line.startswith("# TAPE"):
        active_group = "Tapes"
    elif line.startswith("# VOYAGE"):
        active_group = "Voyages"
        
    transition = None
    
    # 1. Projet Mage
    if line.startswith("## PROJET MAGE"):
        transition = ("Projet Mage", None, "Général", "🎙️ Studio & Artistes")
    elif line.startswith("# ANOTHER TIME"):
        transition = ("Projet Mage", "Projets", "another time", "🎙️ Studio & Artistes")
    elif line.startswith("# CNPPV"):
        transition = ("Projet Mage", "Projets", "Ceci n'est pas pour vous (CNPPV)", "🎙️ Studio & Artistes")
    elif line.startswith("# Planche d’ambiance"):
        transition = ("Projet Mage", "Projets", "Planche d’ambiance", "🎙️ Studio & Artistes")
    elif line.startswith("# Idées") and active_group == "Mage":
        transition = ("Projet Mage", "Projets", "Idées", "🎙️ Studio & Artistes")
    elif line.startswith("# SONS") and active_group == "Mage":
        transition = ("Projet Mage", "Sons", "Sons", "🎙️ Studio & Artistes")
    elif line.startswith("# VISUELS") and active_group == "Mage":
        transition = ("Projet Mage", "Visuels", "Visuels", "🎙️ Studio & Artistes")
        
    # 2. Nelson North
    elif line.startswith("# Sud est maison"):
        transition = ("Nelson North", "Projets", "Sud est maison", "🎙️ Studio & Artistes")
    elif line.startswith("# VISUS") and active_group == "Nelson North":
        transition = ("Nelson North", "Visus & Merch", "Visus & Merch", "🎙️ Studio & Artistes")
        
    # 3. REQ1
    elif line.startswith("# PROJETS") and active_group == "REQ1":
        transition = ("REQ1", "Projets", "Projets", "🎙️ Studio & Artistes")
    elif line.startswith("# SONS") and active_group == "REQ1":
        transition = ("REQ1", "Sons & Maquettes", "Sons & Maquettes", "🎙️ Studio & Artistes")
    elif line.startswith("# VISUELS") and active_group == "REQ1":
        transition = ("REQ1", "Visuels", "Visuels", "🎙️ Studio & Artistes")
        
    # 4. Shorebreak
    elif line.startswith("# LIVE") and active_group == "Shorebreak":
        transition = ("Shorebreak", "Projets", "Live", "🎙️ Studio & Artistes")
    elif line.startswith("# MTP 2025"):
        transition = ("Shorebreak", "Projets", "MTP 2025", "🎙️ Studio & Artistes")
    elif line.startswith("# SESSION LIVE") and active_group == "Shorebreak":
        transition = ("Shorebreak", "Projets", "Session Live", "🎙️ Studio & Artistes")
    elif line.startswith("# EPK") and active_group == "Shorebreak":
        transition = ("Shorebreak", "Projets", "EPK", "🎙️ Studio & Artistes")
    elif line.startswith("# PVNM"):
        transition = ("Shorebreak", "Projets", "PVNM", "🎙️ Studio & Artistes")
        
    # 5. Collabs
    elif line.startswith("# ALAMERCOMMEALAMER"):
        transition = ("A La Mer Comme A La Mer", None, "Général", "💿 Sorties & Collabs")
    elif line.startswith("# MAQUETTES") and active_group == "A La Mer Comme A La Mer":
        transition = ("A La Mer Comme A La Mer", "Maquettes & Collabs", "Maquettes", "💿 Sorties & Collabs")
    elif line.startswith("# PRODS") and active_group == "A La Mer Comme A La Mer":
        transition = ("A La Mer Comme A La Mer", "Maquettes & Collabs", "Prods", "💿 Sorties & Collabs")
    elif line.startswith("# CODENAMETGUNPEU"):
        transition = ("A La Mer Comme A La Mer", "CODENAMETGUNPEU", "CODENAMETGUNPEU", "💿 Sorties & Collabs")
        
    # 6. Grande Maison
    elif line.startswith("# CORP"):
        transition = ("Grande Maison", "Corp", "SAS & Corp", "🏢 Label & Structure")
    elif line.startswith("# MAISON") and active_group == "Grande Maison":
        transition = ("Grande Maison", "Corp", "Locaux", "🏢 Label & Structure")
    elif line.startswith("# FINANCES"):
        transition = ("Grande Maison", "Corp", "Finances", "🏢 Label & Structure")
    elif line.startswith("# CONTACTS"):
        transition = ("Grande Maison", "Contacts", "Contacts", "🏢 Label & Structure")
    elif line.startswith("# VISUELS") and active_group == "Grande Maison":
        transition = ("Grande Maison", "Visuels & Merch", "Visuels & Merch", "🏢 Label & Structure")
    elif line.startswith("# LOGO"):
        transition = ("Grande Maison", "Visuels & Merch", "Logo", "🏢 Label & Structure")
        
    # Tech
    elif line.startswith("# SITE"):
        transition = ("Site & Infrastructure", None, "Site Web & Radio", "🌐 Tech & Infrastructure")
        
    # 7. VST
    elif line.startswith("# VST/PLUGIN"):
        transition = ("VST & Plugins", None, "Général", "🔌 Boutique & VST")
    elif line.startswith("## GM_") and active_group == "VST & Plugins":
        plugin_name = stripped.replace("##", "").replace("*", "").strip()
        transition = ("VST & Plugins", "Plugins", plugin_name, "🔌 Boutique & VST")
        
    # 8. Exp / Jeu
    elif line.startswith("# EXP/JEU"):
        transition = ("Exp / Jeu", None, "Général", "🛫 Lab d'Idées & Voyages")
    elif (line.startswith("## HUIT TRIGRAMMES") or line.startswith("## DUALITE") or line.startswith("## **DUALITE**")) and active_group == "Exp / Jeu":
        name = stripped.replace("##", "").replace("*", "").strip()
        transition = ("Exp / Jeu", "Scénarios", name, "🛫 Lab d'Idées & Voyages")
        
    # 9. Tapes
    elif line.startswith("# TAPE"):
        transition = ("Tapes", None, "Général", "💿 Sorties & Collabs")
    elif line.startswith("# 1") and active_group == "Tapes":
        transition = ("Tapes", "Mixtapes", "Tape 1", "💿 Sorties & Collabs")
    elif line.startswith("# LIVESESSIONS"):
        transition = ("Tapes", "Mixtapes", "Live Sessions", "💿 Sorties & Collabs")
        
    # 10. Voyages
    elif line.startswith("# VOYAGE"):
        transition = ("Voyages", None, "Général", "🛫 Lab d'Idées & Voyages")
    elif (line.startswith("# AMSTERDAM") or line.startswith("# BARCA")) and active_group == "Voyages":
        name = stripped.replace("#", "").strip()
        transition = ("Voyages", "Destinations", name, "🛫 Lab d'Idées & Voyages")

    if transition:
        if current_page and current_lines:
            pages_data.append({
                "livre": current_livre,
                "parent_page": current_parent_page,
                "page": current_page,
                "category": current_category,
                "lines": current_lines.copy()
            })
            current_lines.clear()
        current_livre, current_parent_page, current_page, current_category = transition
    else:
        if current_page:
            current_lines.append(line)

if current_page and current_lines:
    pages_data.append({
        "livre": current_livre,
        "parent_page": current_parent_page,
        "page": current_page,
        "category": current_category,
        "lines": current_lines
    })

# 4. Insert into database
print("\n--- 4. Inserting Livres, Pages and Canvas Blocks ---")
now_time = int(time.time())

inserted_livres = {}
inserted_parent_pages = {}

for p in pages_data:
    livre_title = p["livre"]
    parent_page_title = p["parent_page"]
    page_title = p["page"]
    cat_name = p["category"]
    cat_id = category_ids[cat_name]
    
    # 4.1 Ensure Livre exists
    if livre_title not in inserted_livres:
        livre_id = str(uuid.uuid4())
        print(f"Creating Livre: '{livre_title}' in Category '{cat_name}'")
        cursor.execute(
            "INSERT INTO projects (id, title, description, space, visibility, owner_id, category_id, status, parent_id, canvas_pan_x, canvas_pan_y, canvas_zoom, created_at, updated_at) "
            "VALUES (?, ?, ?, 'shared', 'private', ?, ?, 'active', NULL, 0, 0, 1.0, ?, ?)",
            (livre_id, livre_title, f"Livre {livre_title} importé de Milanote", owner_id, cat_id, now_time, now_time)
        )
        inserted_livres[livre_title] = livre_id
    
    livre_id = inserted_livres[livre_title]
    
    # 4.2 Determine parent project ID for the page
    parent_proj_id = livre_id
    if parent_page_title:
        parent_key = (livre_title, parent_page_title)
        if parent_key not in inserted_parent_pages:
            parent_id = str(uuid.uuid4())
            print(f"  Creating Category Folder Page: '{parent_page_title}' under Livre '{livre_title}'")
            cursor.execute(
                "INSERT INTO projects (id, title, description, space, visibility, owner_id, category_id, status, parent_id, canvas_pan_x, canvas_pan_y, canvas_zoom, created_at, updated_at) "
                "VALUES (?, ?, ?, 'shared', 'private', ?, ?, 'active', ?, 0, 0, 1.0, ?, ?)",
                (parent_id, parent_page_title, f"Sous-dossier {parent_page_title}", owner_id, cat_id, livre_id, now_time, now_time)
            )
            inserted_parent_pages[parent_key] = parent_id
        parent_proj_id = inserted_parent_pages[parent_key]
        
    # 4.3 Create the target Page (sub-project)
    page_id = str(uuid.uuid4())
    print(f"    Inserting Page: '{page_title}'...")
    cursor.execute(
        "INSERT INTO projects (id, title, description, space, visibility, owner_id, category_id, status, parent_id, canvas_pan_x, canvas_pan_y, canvas_zoom, created_at, updated_at) "
        "VALUES (?, ?, ?, 'shared', 'private', ?, ?, 'active', ?, 0, 0, 1.0, ?, ?)",
        (page_id, page_title, f"Page {page_title}", owner_id, cat_id, parent_proj_id, now_time, now_time)
    )
    
    # 4.4 Parse page lines into canvas blocks
    blocks = []
    checklist_buffer = []
    code_buffer = []
    in_code_block = False
    code_lang = "text"
    markdown_buffer = []
    
    def flush_markdown():
        if markdown_buffer:
            text_content = "".join(markdown_buffer).strip()
            if text_content:
                blocks.append({
                    "type": "markdown",
                    "content": {"text": text_content}
                })
            markdown_buffer.clear()

    def flush_checklist():
        if checklist_buffer:
            blocks.append({
                "type": "checklist",
                "content": {"items": checklist_buffer.copy()}
            })
            checklist_buffer.clear()

    def flush_code():
        if code_buffer:
            blocks.append({
                "type": "code",
                "content": {
                    "language": code_lang,
                    "code": "".join(code_buffer).strip()
                }
            })
            code_buffer.clear()
            
    for line in p['lines']:
        stripped_line = line.strip()
        
        # Code block toggle
        if line.startswith("```"):
            if in_code_block:
                in_code_block = False
                flush_code()
            else:
                in_code_block = True
                lang = stripped_line[3:].strip()
                code_lang = lang if lang else "javascript"
            continue
            
        if in_code_block:
            code_buffer.append(line)
            continue
            
        # Checklist item
        chk_match = re.match(r'^-\s+\[([ xX])\]\s+(.*)', stripped_line)
        if chk_match:
            flush_markdown()
            checked = chk_match.group(1).lower() == 'x'
            item_text = chk_match.group(2).strip()
            checklist_buffer.append({"text": item_text, "checked": checked})
            continue
        else:
            flush_checklist()
            
        # Media block (image or file link)
        img_match = re.search(r'!\[(.*?)\]\((.*?)\)', stripped_line)
        file_match = re.search(r'\[(.*?)\]\((.*?)\)', stripped_line)
        
        is_media = False
        media_url = ""
        media_title = ""
        media_type = "image"
        
        if img_match:
            is_media = True
            media_url = img_match.group(2).strip()
            media_title = img_match.group(1).strip() or "Image"
            media_type = "image"
        elif file_match:
            url_field = file_match.group(2).strip()
            title_field = file_match.group(1).strip()
            lower_url = url_field.lower()
            
            if any(ext in lower_url for ext in [".wav", ".mp3", ".ogg", ".flac", ".m4a", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf", ".vst3"]):
                is_media = True
                media_url = url_field
                media_title = title_field
                if any(ext in lower_url for ext in [".wav", ".mp3", ".ogg", ".flac", ".m4a"]):
                    media_type = "audio"
                elif ".pdf" in lower_url:
                    media_type = "pdf"
                elif ".vst3" in lower_url:
                    media_type = "pdf"
                else:
                    media_type = "image"
                    
        if is_media:
            flush_markdown()
            resolved_url, resolved_name = resolve_file_url(media_url)
            blocks.append({
                "type": "media",
                "content": {
                    "url": resolved_url,
                    "mediaType": media_type,
                    "title": resolved_name,
                    "caption": f"Fichier importé : {resolved_name}"
                }
            })
            continue
            
        markdown_buffer.append(line)
        
    flush_markdown()
    flush_checklist()
    flush_code()
    
    # Layout blocks dynamically on the canvas
    canvas_x = 50
    canvas_y = 50
    col = 0
    max_h_in_row = 0
    
    for idx, b in enumerate(blocks):
        block_id = str(uuid.uuid4())
        w = 400
        if b['type'] == 'markdown':
            h = max(200, min(500, len(b['content']['text']) // 2 + 100))
        elif b['type'] == 'checklist':
            h = max(180, len(b['content']['items']) * 35 + 90)
        elif b['type'] == 'code':
            h = max(220, min(500, len(b['content']['code']) // 3 + 120))
        else:
            h = 280
            
        bx = canvas_x + col * 450
        by = canvas_y
        
        cursor.execute(
            "INSERT INTO blocks (id, project_id, type, content, \"order\", canvas_x, canvas_y, canvas_w, canvas_h, canvas_z, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)",
            (block_id, page_id, b['type'], json.dumps(b['content']), idx, bx, by, w, h, now_time, now_time)
        )
        
        max_h_in_row = max(max_h_in_row, h)
        col = (col + 1) % 2
        if col == 0:
            canvas_y += max_h_in_row + 40
            max_h_in_row = 0

conn.commit()
conn.close()

print("\n--- Import finished successfully! ---")
