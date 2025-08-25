/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GO_API_URL: string
  readonly VITE_PY_API_URL: string
  // add more env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
