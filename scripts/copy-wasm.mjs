// tasks-vision의 wasm을 public/wasm/<버전>/으로 복사한다. 버전을 경로에 넣어야 immutable 캐시가 예전 파일(또는 예전 404)을 붙잡지 않는다
import { cpSync, readFileSync, rmSync } from "node:fs";

const src = "node_modules/@mediapipe/tasks-vision";
const { version } = JSON.parse(readFileSync(`${src}/package.json`, "utf8"));
rmSync("public/wasm", { recursive: true, force: true });
cpSync(`${src}/wasm`, `public/wasm/${version}`, { recursive: true });
console.log(`tasks-vision ${version} wasm → public/wasm/${version}`);
