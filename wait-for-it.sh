#!/bin/sh
# wait-for-it.sh
# Wait for a host and port to be available

host="$1"
port="$2"
shift 2

until nc -z "$host" "$port"; do
  echo "Waiting for $host:$port..."
  sleep 1
done
exec "$@"
