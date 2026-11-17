#!/usr/bin/env bash
# Restaura o banco a partir de um backup (arquivo banco-*.dump). CUIDADO: substitui o banco atual.
# Uso, dentro da pasta deploy/:   ./restaurar.sh /var/backups/beatus/banco-20261120-033000.dump
#
# Antes de restaurar, ele faz uma cópia do banco como está agora (para dar para voltar atrás).

set -euo pipefail

cd "$(dirname "$0")"

ARQUIVO="${1:-}"

if [ -z "$ARQUIVO" ] || [ ! -f "$ARQUIVO" ]; then
  echo "Uso: ./restaurar.sh caminho/do/banco-AAAAMMDD-HHMMSS.dump" >&2

  exit 1
fi

echo "Isto vai SUBSTITUIR todos os dados do banco pelos de: $ARQUIVO"

read -r -p "Digite RESTAURAR para continuar: " CONFIRMA

if [ "$CONFIRMA" != "RESTAURAR" ]; then
  echo "Cancelado."

  exit 1
fi

SEGURANCA="${BACKUP_DIR:-/var/backups/beatus}/antes-de-restaurar-$(date +%Y%m%d-%H%M%S).dump"

mkdir -p "$(dirname "$SEGURANCA")"

echo "[restaurar] guardando o banco atual em $SEGURANCA ..."

docker compose exec -T banco pg_dump -U beatus -Fc beatus > "$SEGURANCA"

echo "[restaurar] parando o aplicativo..."

docker compose stop app

echo "[restaurar] restaurando..."

docker compose exec -T banco pg_restore -U beatus -d beatus --clean --if-exists --no-owner < "$ARQUIVO"

echo "[restaurar] subindo o aplicativo..."

docker compose up -d app

echo "[restaurar] pronto."
