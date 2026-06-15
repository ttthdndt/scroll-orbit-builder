import JSZip from "jszip";
import { saveAs } from "file-saver";
import { buildPreviewDocument } from "./generateSnippet";

export interface ExportArgs {
  spriteBlob: Blob;
  snippet: string;
  containerId: string;
}

const README = `# Scroll Orbit Snippet

This package contains everything you need to add a scroll-driven
360-degree rotation effect (like the one on rolex.com product pages)
to a WordPress / Webflow / any HTML page.

## Files

- **sprite.jpg**       The frame sprite sheet (a grid of all extracted frames).
- **snippet.html**      The HTML/CSS/JS block to paste into your page.
- **preview.html**      A standalone test page -- open this in a browser to
                         try the effect locally before publishing.

## How to use it (WordPress)

1. Upload **sprite.jpg** to your Media Library and copy its URL
   (Media Library -> click the image -> "Copy URL").
2. Open **snippet.html** in a text editor.
3. Find this line near the top of the <script> block:

       spriteUrl: "./sprite.jpg",

   Replace "./sprite.jpg" with the URL you copied in step 1.
4. Copy the ENTIRE contents of snippet.html.
5. In WordPress, edit the page/post, add a "Custom HTML" block
   (Gutenberg) or an "HTML" widget (Elementor / other builders),
   and paste the snippet in.
6. Publish / preview the page and scroll through the section.

## Tuning the effect

Inside snippet.html you can tweak:

- \`height: 300vh\` on the outer \`#scroll-orbit-...\` rule -- controls how
  much scrolling is needed for a full rotation. Larger = slower/longer.
- \`background: ...\` on \`.so-sticky\` -- background color behind the product.
- The \`<h2>\` / \`<p>\` text inside \`.so-caption-top\` -- headline & eyebrow text.
- \`cfg.frameCount\`, \`cfg.columns\`, \`cfg.rows\` -- only change these if you
  regenerate the sprite sheet with different settings.

## Notes

- The snippet is self-contained and scoped to its own unique ID, so it's
  safe to drop into an existing page without CSS conflicts.
- Respects \`prefers-reduced-motion\`: shows a single static frame instead
  of the scroll animation for users who have that setting enabled.
- Works on mobile -- the canvas resizes responsively.
`;

export async function downloadOrbitPackage({ spriteBlob, snippet, containerId }: ExportArgs) {
  const zip = new JSZip();

  zip.file("sprite.jpg", spriteBlob);
  zip.file("snippet.html", snippet);

  const previewSnippet = snippet.replace("./sprite.jpg", "sprite.jpg");
  zip.file("preview.html", buildPreviewDocument(previewSnippet));
  zip.file("README.md", README);

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${containerId}.zip`);
}
