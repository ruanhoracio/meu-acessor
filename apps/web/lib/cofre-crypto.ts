/**
 * Criptografia do Cofre — roda só no navegador (WebCrypto).
 *
 * Modelo "conhecimento zero": a chave é derivada da senha de login com
 * PBKDF2 e nunca sai do aparelho; o servidor guarda apenas o texto cifrado
 * (AES-256-GCM, IV aleatório por item). Quem tiver o banco, a Vercel ou o
 * DATABASE_URL não lê nada.
 *
 * Consequência: sem a senha não há como recuperar o cofre. Ao trocar a
 * senha, tudo é recifrado no cliente (ver Configurações).
 */

const ITERACOES = 310_000;
const CHAVE_SESSAO = "cofre:chave";

const enc = new TextEncoder();
const dec = new TextDecoder();

function bytesParaB64(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function b64ParaBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function gerarSalt(): string {
  return bytesParaB64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function derivarChave(senha: string, saltB64: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(senha), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64ParaBytes(saltB64) as BufferSource, iterations: ITERACOES, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function cifrar(chave: CryptoKey, dados: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, chave, enc.encode(JSON.stringify(dados)));
  const tudo = new Uint8Array(iv.length + ct.byteLength);
  tudo.set(iv, 0);
  tudo.set(new Uint8Array(ct), iv.length);
  return bytesParaB64(tudo);
}

/** Lança se a chave estiver errada (o GCM detecta). */
export async function decifrar<T = unknown>(chave: CryptoKey, cifraB64: string): Promise<T> {
  const tudo = b64ParaBytes(cifraB64);
  const iv = tudo.slice(0, 12);
  const ct = tudo.slice(12);
  const claro = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, chave, ct as BufferSource);
  return JSON.parse(dec.decode(claro)) as T;
}

/** Cria o "verificador": um bloco cifrado usado só para conferir a senha. */
export function verificadorDe(chave: CryptoKey): Promise<string> {
  return cifrar(chave, { ok: true });
}

export async function chaveConfere(chave: CryptoKey, verificador: string): Promise<boolean> {
  try {
    const v = await decifrar<{ ok?: boolean }>(chave, verificador);
    return v?.ok === true;
  } catch {
    return false;
  }
}

/** Mantém a chave só pela vida da aba (sessionStorage), nunca em disco. */
export async function guardarChave(chave: CryptoKey): Promise<void> {
  const raw = await crypto.subtle.exportKey("raw", chave);
  try {
    sessionStorage.setItem(CHAVE_SESSAO, bytesParaB64(new Uint8Array(raw)));
  } catch {
    // sessionStorage bloqueado: o cofre pede a senha de novo nesta aba
  }
}

export async function chaveGuardada(): Promise<CryptoKey | null> {
  try {
    const b64 = sessionStorage.getItem(CHAVE_SESSAO);
    if (!b64) return null;
    return await crypto.subtle.importKey("raw", b64ParaBytes(b64) as BufferSource, { name: "AES-GCM" }, true, [
      "encrypt",
      "decrypt",
    ]);
  } catch {
    return null;
  }
}

export function esquecerChave(): void {
  try {
    sessionStorage.removeItem(CHAVE_SESSAO);
  } catch {}
}

export function gerarSenha(tamanho = 16, simbolos = true): string {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const numeros = "23456789";
  const sim = "!@#$%&*?-_+=";
  const alfabeto = letras + numeros + (simbolos ? sim : "");
  const rnd = crypto.getRandomValues(new Uint32Array(tamanho));
  let s = "";
  for (let i = 0; i < tamanho; i++) s += alfabeto[rnd[i] % alfabeto.length];
  return s;
}
