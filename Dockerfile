# =========================================================
# Zac Morgan Photography — Local Docker Site
# Served by Nginx on port 8080
# =========================================================
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config (listens on 8080)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the entire site into nginx's web root
COPY . /usr/share/nginx/html/

# Expose on port 8080 so it doesn't need root / conflict with system port 80
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
