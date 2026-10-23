// These resources may be disabled independently of the D1-backed site.
// Required deployed bindings are generated from wrangler.toml instead.
interface Env {
  CACHE?: KVNamespace;
  PHOTO_BUCKET?: R2Bucket;
}
