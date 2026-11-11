#!/usr/bin/env bash
# Build one product image and request /health from inside the container.
# setup_remote_docker does not publish ports onto the job's localhost, so
# curling 127.0.0.1 on the job VM can pass while the app is down. The probe
# runs with docker exec, on the container's own loopback.
# A missing Stripe key must NOT make this gate green by inventing a checkout
# URL: /api/checkout is required to answer 503 in that case.
# Added 2026-11-11 by MarketShipper.
set -euo pipefail

PRODUCT="${1:?product name required}"
if [[ ! "$PRODUCT" =~ ^[a-z0-9-]+$ ]]; then
  echo "invalid product name" >&2
  exit 1
fi

decision="$(bash .circleci/scripts/product-diff.sh "$PRODUCT")"
if [[ "$decision" == "skip" ]]; then
  echo "No ${PRODUCT} image inputs in this diff. Image was not built."
  exit 0
fi

echo "Running ${PRODUCT} server tests"
node --test "tests/${PRODUCT}-image-gate.test.js" tests/select-do-app.test.js

IMAGE="${PRODUCT}:ci"
NAME="${PRODUCT}-ci-health"

echo "Building ${IMAGE}"
docker build -f "products/${PRODUCT}/Dockerfile" -t "$IMAGE" .

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e STRIPE_MODE=test "$IMAGE"

cleanup() {
  status=$?
  echo "---- ${NAME} logs ----" >&2
  docker logs "$NAME" >&2 || true
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  exit "$status"
}
trap cleanup EXIT

ok=0
for _ in $(seq 1 30); do
  if docker exec -e EXPECT_SERVICE="$PRODUCT" "$NAME" node --input-type=module -e '
const service = process.env.EXPECT_SERVICE;
const health = await fetch("http://127.0.0.1:8080/health");
const body = await health.json();
if (health.status !== 200 || body.status !== "ok" || body.service !== service) {
  console.error("health failed", health.status, JSON.stringify(body));
  process.exit(1);
}
console.log(JSON.stringify(body));
for (const path of ["/", "/pricing"]) {
  const page = await fetch("http://127.0.0.1:8080" + path);
  if (page.status !== 200) {
    console.error(path + " failed", page.status);
    process.exit(1);
  }
}
const checkout = await fetch("http://127.0.0.1:8080/api/checkout", { method: "POST" });
const checkoutBody = await checkout.json();
if (checkout.status !== 503 || checkoutBody.ok !== false) {
  console.error("checkout without keys must stay unavailable", checkout.status, JSON.stringify(checkoutBody));
  process.exit(1);
}
console.log("checkout without keys:", checkout.status, checkoutBody.reason);
'; then
    ok=1
    break
  fi
  sleep 2
done

if [[ "$ok" != "1" ]]; then
  echo "${PRODUCT} /health probe failed" >&2
  exit 1
fi

echo "${PRODUCT} image gate passed"
exit 0
