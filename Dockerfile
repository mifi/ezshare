# ==========================================
# STAGE 1: The Builder (Heavy, used only for compiling)
# ==========================================
FROM node:20 AS builder

RUN corepack enable
WORKDIR /app

# Install git
RUN apt-get update && \
    apt-get install -y --no-install-recommends git && \
    rm -rf /var/lib/apt/lists/*

# Git Clone branch and repository
RUN git clone https://github.com/mifi/ezshare.git .

# Copy the source code (enable this if using for development mode - you'll need to have local copy of the code)
#COPY ezshare/ ./

# Install ALL dependencies (including dev tools like TypeScript) and build
RUN yarn install --immutable
RUN yarn build

# ==========================================
# STAGE 2: The Runner (Lightweight, final production image)
# ==========================================
# We use node:20-slim here, which is hundreds of MBs smaller!
FROM node:20-slim AS runner

# Install ffmpeg, xsel, xvfb and immediately clean up the apt cache to save space
RUN apt-get update && \
    apt-get install --no-install-recommends -y xvfb ffmpeg xsel dbus && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable
WORKDIR /app

# Copy ONLY the necessary files from the "builder" stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/.yarnrc.yml ./
COPY --from=builder /app/.yarn ./.yarn

# Copy the packages folder (which now contains the built "dist" folders)
COPY --from=builder /app/packages ./packages

# Optional but recommended: Remove the heavy "src" folders since we only need "dist" now
RUN rm -rf packages/*/src

# Install ONLY production dependencies (ignores devDependencies) and clean Yarn cache
RUN yarn workspaces focus --production $(node -p "require('./packages/cli/package.json').name") && yarn cache clean --all

#To have fake display
RUN echo '#!/bin/bash\n\
Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &\n\
export DISPLAY=:99\n\
sleep 1\n\
exec dbus-run-session -- "$@"' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Create the shared directory
RUN mkdir /shared

# --- SECURITY CHANGES START ---
# 1. Change ownership of /app and /shared to the 'node' user (UID 1000)
#    This ensures the user can write to these locations.
RUN chown -R node:node /app /shared

# 2. Switch to non-root user
USER node
# --- SECURITY CHANGES END ---

# Expose port and start
EXPOSE 3003
CMD ["/app/entrypoint.sh", "node", "packages/cli/dist/index.js", "/shared", "--port", "3003"]
