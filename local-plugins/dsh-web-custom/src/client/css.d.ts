/** Class map emitted by DSH's CSS module bundler. */
declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}

/** Global plugin stylesheet registered by DSH's client bundler. */
declare module '*.css' {}
