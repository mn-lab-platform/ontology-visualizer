FROM nginx:1.27-alpine

ENV ARCHES_LOCAL_BASE_URL=http://host.docker.internal:8000
ENV ARCHES_LOCAL_HOST_HEADER=localhost:8000
ENV ARCHES_MAIN_BASE_URL=http://host.docker.internal:8000
ENV ARCHES_MAIN_HOST_HEADER=localhost:8000

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY . /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]