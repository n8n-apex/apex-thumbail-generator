
## APEX AI Image Intelligence – Photoshop-artiger Image Editor

### Was wird entfernt
- Alle Video-Editor-Komponenten (reel/*, editor/*, video hooks, canvas-exporter, audio-*, transcript-*)
- Video-bezogene Edge Functions (transcribe, transcribe-deepgram, generate-thumbnail)
- Video-bezogene Types und Libs

### Was wird gebaut

#### 1. UI – Photoshop-artiges Interface
- **Sidebar links**: Werkzeuge (Upload, AI-Edit, Zuschneiden, Hintergrund entfernen, Verbessern)
- **Canvas Mitte**: Bildvorschau mit Zoom/Pan
- **Sidebar rechts**: Eigenschaften-Panel (Größe, Format, AI-Prompt)
- **Batch-Leiste unten**: Thumbnails aller hochgeladenen Bilder, Multiselect für Batch-Operationen

#### 2. Kern-Features
- **Multi-Upload**: Drag & Drop mehrere Bilder (JPG, PNG, WebP, HEIC → auto-convert)
- **AI Hintergrund entfernen/ersetzen**: Via Lovable AI (Gemini Image) – Hintergrund transparent oder durch Prompt ersetzen
- **Social Media Zuschnitt**: Presets für Instagram Post (1080×1080), Story (1080×1920), TikTok (1080×1920), LinkedIn (1200×627), Facebook Cover (820×312), YouTube Thumbnail (1280×720)
- **AI-Bildverbesserung**: Automatische Optimierung (Helligkeit, Kontrast, Schärfe) via AI
- **Batch-Modus**: Gleiche Operation auf alle ausgewählten Bilder anwenden

#### 3. Backend
- Edge Function `ai-image-edit` → Nutzt Lovable AI Gateway mit Gemini Image Model
- Storage Bucket für hochgeladene + bearbeitete Bilder
- Kein Auth nötig (erstmal ohne Login)

#### 4. Tech-Stack
- Canvas API für clientseitiges Zuschneiden/Resize
- Lovable AI Gateway (google/gemini-2.5-flash-image) für AI-Bildbearbeitung
- Cloud Storage für temporäre Bilder
