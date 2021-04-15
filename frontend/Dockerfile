ARG DEPLOYMENT_ENVIRONMENT

# Build version is a temporary fix; DEPLOYMENT_ENVIRONMENT should 
# signify the same thing but I'm making two variables to maintain
# what uar originally produced. 
ARG FRONTEND_BUILD_VERSION
FROM node:14-stretch AS branch-version-development
RUN mkdir -p /code
WORKDIR /code

# Build the App
COPY ["package.json", \ 
     ".babelrc", \
     ".eslintrc.json", \
     ".prettierrc",   \
     "jsconfig.json", \
     "yarn.lock", \
     "/code/"] 

RUN yarn install  
# Yarn is expensive w.r.t. time. We don't want it to run everytime we change
# the source.
COPY public /code/public

ARG REACT_APP_API_URL
ARG REACT_APP_WS_API_URL
ARG PORT
ENV PORT=$PORT
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WS_API_URL=$REACT_APP_WS_API_URL

COPY [".env",  \
     "/code/"]
COPY src /code/src
ARG FRONTEND_BUILD_VERSION
RUN yarn build-${FRONTEND_BUILD_VERSION}

# We want the ability to use npm for development so we choose w/ multi-stage
# build conditionals
FROM nginx:1.16.1 AS branch-version-production
RUN rm -rf /etc/nginx/conf.d
COPY nginx.conf /etc/nginx/nginx.conf.template
ARG FRONTEND_HOST
ENV FRONTEND_HOST=$FRONTEND_HOST
ARG PORT
ENV PORT=$PORT
RUN envsubst '${FRONTEND_HOST}:${PORT}' < '/etc/nginx/nginx.conf.template' > '/etc/nginx/nginx.conf'
COPY --from=branch-version-development /code/build /var/www

FROM nginx:1.16.1 AS branch-version-staging
ARG FRONTEND_HOST
ENV FRONTEND_HOST=$FRONTEND_HOST
ARG PORT
ENV PORT=$PORT
COPY --from=branch-version-production /etc/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=branch-version-production /var/www /var/www

# Forgetting the value of ARG does not seem to apply to the FROM statements
FROM branch-version-${DEPLOYMENT_ENVIRONMENT} AS branch
FROM branch
COPY entrypoint.sh "/code/entrypoint.sh"
EXPOSE 80
ARG DEPLOYMENT_ENVIRONMENT
ENV DEPLOYMENT_ENVIRONMENT=$DEPLOYMENT_ENVIRONMENT
ENV FRONTEND_BUILD_VERSION=$FRONTEND_BUILD_VERSION

ENTRYPOINT [ "/bin/bash",  "-e", "/code/entrypoint.sh"]

