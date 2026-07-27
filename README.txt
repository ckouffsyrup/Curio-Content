SetSmith Web v0.2.1
===================

A polished, browser-based, mobile-friendly Curio set builder.

RUN LOCALLY
-----------
Double-click index.html. ZIP export loads JSZip from a CDN, so internet access is
needed for exporting ZIP files when opening the app directly.

HOST ON GITHUB PAGES
--------------------
1. Create a new GitHub repository.
2. Upload index.html, styles.css, and app.js to the repository root.
3. Open Settings > Pages.
4. Set the source to "Deploy from a branch".
5. Select the main branch and root folder.
6. Save. GitHub will provide the site address.

FEATURES
--------
- Responsive phone, tablet, and desktop layout
- Upload or drag multiple Curio images
- PNG/JPG/JPEG/WEBP/GIF/BMP set icons
- Edit name, ID, rarity, description, and enabled state
- Green enabled borders and red disabled borders
- Search and filters
- Live set statistics
- Automatic local browser autosave using IndexedDB
- Portable .setsmith project downloads with images embedded
- Reopen SetSmith Web .setsmith projects
- Finished Curio set ZIP export with set.json, curios.json, icon, and images

IMPORTANT
---------
Desktop SetSmith .setsmith files store Windows file paths rather than image data.
A desktop project therefore cannot be fully opened on a phone unless its images
are embedded. For moving a desktop project to the web version, export the
finished Curio set on the desktop first. A future web version can add direct ZIP
set import.

Browser local saves belong to that browser/device. Download the portable
.setsmith project when moving between devices or as a backup.


V0.2.1 EXPORT NAME FIX
----------------------
Exported ZIP and root folder names now replace spaces with underscores for
GitHub-friendly paths.

Example:
  Display name in set.json: The Lands That Border
  Downloaded ZIP:          The_Lands_That_Border.zip
  Folder inside ZIP:       The_Lands_That_Border/

The visible set name is not modified, so Curio continues to display normal
spaces in-game.
