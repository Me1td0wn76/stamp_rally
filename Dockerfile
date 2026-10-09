# フロントエンドとバックエンドを 1 つのコンテナにまとめる
# Go のサーバーがビルド済みの画面も配信するので、公開する URL は 1 つで済む
#
# 手元で試すとき:
#   docker build -t stamp-rally .
#   docker run --rm -p 8080:8080 -e COOKIE_SECURE=false stamp-rally
#   → http://localhost:8080

# ---- フロントエンドのビルド ----
FROM node:24-slim AS front
WORKDIR /front
COPY stamp_rally_front/package.json stamp_rally_front/package-lock.json ./
RUN npm ci
COPY stamp_rally_front/ ./
RUN npm run build

# ---- バックエンドのビルド ----
FROM golang:1.26 AS back
WORKDIR /src
COPY go_backend/go.mod go_backend/go.sum ./
RUN go mod download
COPY go_backend/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /server ./go_back

# ---- 実行用(Go のバイナリと画面のファイルだけを入れた小さいイメージ) ----
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=back /server /server
COPY --from=front /front/dist /app/dist
ENV GIN_MODE=release \
    STATIC_DIR=/app/dist \
    COOKIE_SECURE=true
EXPOSE 8080
ENTRYPOINT ["/server"]
