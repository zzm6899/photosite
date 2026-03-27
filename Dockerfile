# =========================================================
# Zac Morgan Photography — Local Docker Site
# Served by Nginx on port 8080
# =========================================================
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the entire site into nginx's web root
COPY . /usr/share/nginx/html/

# Expose on port 8080 so it doesn't need root / conflict with system port 80
EXPOSE 8080

# Override nginx to listen on 8080
RUN sed -i 's/listen 80;/listen 8080;/' /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
