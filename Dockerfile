FROM debian:bullseye-slim

# The complete dependency list for a headless Electron + FFmpeg environment
RUN apt-get update && apt-get install -y \
    curl xvfb ffmpeg dbus-x11 xsel \
    libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libgtk-3-0 \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxext6 \
    libxfixes3 libxrandr2 libgbm1 libasound2 \
    fonts-liberation libfontconfig1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the distribution folder
COPY ezshare-linux-x64/ /app/ezshare-dist/
RUN chmod +x /app/ezshare-dist/ezshare
RUN ln -s /app/ezshare-dist/ezshare /usr/local/bin/ezshare

# Entrypoint script ensures Xvfb and D-Bus are ready
RUN echo '#!/bin/bash\n\
Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &\n\
export DISPLAY=:99\n\
sleep 1\n\
exec dbus-run-session -- "$@"' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 3003

ENTRYPOINT ["/app/entrypoint.sh", "ezshare"]

