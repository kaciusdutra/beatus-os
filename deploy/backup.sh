#!/usr/bin/env bash
# Backup do Beatus: o banco (pedidos, clientes, tudo) e os arquivos enviados (documentos das compras).
# Rode no servidor, dentro da pasta deploy/:   ./backup.sh
# Para rodar todo dia às 03:30, veja docs/HOSPEDAGEM.md (cron).
#
# Fica em BACKUP_DIR (padrão /var/backups/beatus) por 14 dias. Para guardar FORA do servidor (o certo, porque
# um backup no mesmo servidor some junto com ele), defina RCLONE_REMOTE (ex.: RCLONE_REMOTE=nuvem:beatus) com o
# rclone já configurado: o script copia os arquivos novos para lá.

set -euo pipefail

cd "$(dirname "$0")"

DESTINO="${BACKUP_DIR:-/var/backups/beatus}"

CARIMBO="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$DESTINO"

echo "[backup] banco..."

docker compose exec -T banco pg_dump -U beatus -Fc beatus > "$DESTINO/banco-$CARIMBO.dump"

echo "[backup] arquivos enviados..."

docker run --rm -v beatus_storage:/dados:ro -v "$DESTINO":/saida alpine tar czf "/saida/arquivos-$CARIMBO.tar.gz" -C /dados .

# Um backup vazio ou truncado não vale: confere que o dump abre.
docker compose exec -T banco pg_restore --list < "$DESTINO/banco-$CARIMBO.dump" > /dev/null

echo "[backup] guardando 14 dias..."

find "$DESTINO" -type f \( -name 'banco-*.dump' -o -name 'arquivos-*.tar.gz' \) -mtime +14 -delete

if [ -n "${RCLONE_REMOTE:-}" ]; then
  echo "[backup] copiando para fora do servidor ($RCLONE_REMOTE)..."

  rclone copy "$DESTINO" "$RCLONE_REMOTE" --max-age 2d
fi

echo "[backup] pronto: $DESTINO/banco-$CARIMBO.dump"
