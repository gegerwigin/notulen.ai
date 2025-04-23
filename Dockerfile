FROM browserless/chrome:latest

# Port yang digunakan
EXPOSE 3002

# Buat direktori kerja
WORKDIR /app

# Salin file-file yang diperlukan
COPY meet-bot.js .
COPY server.js .
COPY package.json .

# Buat direktori node_modules dan ubah kepemilikannya
USER root
RUN mkdir -p /app/node_modules /app/logs && \
    chown -R node:node /app

# Ganti ke pengguna node untuk instalasi
USER node

# Install dependensi
RUN npm install

# Kembali ke pengguna root untuk menjalankan aplikasi
USER root

# Jalankan server
CMD ["node", "server.js"] 