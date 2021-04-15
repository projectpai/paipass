ARG DEPLOYMENT_ENVIRONMENT
# Build version is a temporary fix; DEPLOYMENT_ENVIRONMENT should 
# signify the same thing but I'm making two variables to maintain
# what uar originally produced. 
ARG FRONTEND_BUILD_VERSION
FROM node:lts AS branch-version-development
RUN mkdir -p /code
WORKDIR /code

# Install app dependencies
COPY package.json /code 

# Build the App
# TODO need to add yarn.lock
COPY ["package.json", \
      "yarn.lock", \
     "/code/"] 
COPY public /code/public
RUN yarn install  
# Yarn is expensive w.r.t. time. We don't want it to run everytime we change
# the source.
COPY  [".env.production",  \
     ".env.development", "/code/"]
COPY src /code/src
RUN printf "Build Version=%s hello\n" $FRONTEND_BUILD_VERSION
RUN printf  "DEPLOYMENT_ENVIRONMENT=%s\n" ${DEPLOYMENT_ENVIRONMENT}
# For some reason docker expects ARG to be redeclared otherwise the value
# is forgotten
ARG FRONTEND_BUILD_VERSION
ARG REACT_APP_BASE_URL
ARG PORT
ENV PORT=$PORT
ENV REACT_APP_BASE_URL=$REACT_APP_BASE_URL
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
COPY entrypoint.sh entrypoint.sh
EXPOSE 8080
ARG DEPLOYMENT_ENVIRONMENT
ENV DEPLOYMENT_ENVIRONMENT=$DEPLOYMENT_ENVIRONMENT
ENV FRONTEND_BUILD_VERSION=$FRONTEND_BUILD_VERSION


ENTRYPOINT [ "/bin/bash",  "-e", "./entrypoint.sh"]


