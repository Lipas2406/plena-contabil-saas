import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Existe um package-lock.json solto em C:\Users\Filipe\ que faz o Next
    // inferir a home do usuário como raiz do workspace. Fixando aqui para o
    // build não depender do que existe fora da pasta do projeto.
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
