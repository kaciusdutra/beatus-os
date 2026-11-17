#!/usr/bin/env bash
# Atualiza o Beatus no servidor para a versão mais nova do GitHub.
# Uso, dentro da pasta deploy/:   ./atualizar.sh
#
# Ordem (segura): backup -> baixa o código novo -> compila a imagem -> sobe (as migrações do banco rodam antes
# do aplicativo; se uma falhar, o aplicativo antigo continua no ar) -> mostra o estado.

set -euo pipefail

cd "$(dirname "$0")"

echo "[atualizar] backup antes de mexer..."

./backup.sh

echo "[atualizar] baixando o código novo..."

git -C .. pull --ff-only

echo "[atualizar] compilando e subindo..."

docker compose up -d --build

echo "[atualizar] limpando imagens antigas..."

docker image prune -f > /dev/null

docker compose ps

echo "[atualizar] pronto. Confira: docker compose logs --tail 50 app"
