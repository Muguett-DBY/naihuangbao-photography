Save the original screenshots here before cropping. This folder is outside `public` so raw phone screenshots are not deployed.

- `slide-2.jpg`
- `slide-3.jpg`
- `slide-4.jpg`
- `slide-5.jpg`
- `slide-6.jpg`
- `slide-7.jpg`

The script can also process exactly six image files with arbitrary names; it sorts them by file modified time.

Then run:

```bash
npm run assets:crop
```

The script crops the phone screenshot UI and writes optimized WebP files into `public/images/gallery/`.
