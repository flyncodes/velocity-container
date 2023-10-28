FROM eclipse-temurin:17-jre-alpine

ENV JAVA_MEMORY="512M"
ENV JAVA_FLAGS="-XX:+UseStringDeduplication -XX:+UseG1GC -XX:G1HeapRegionSize=4M -XX:+UnlockExperimentalVMOptions -XX:+ParallelRefProcEnabled -XX:+AlwaysPreTouch"

WORKDIR /data

RUN apk add --upgrade --no-cache openssl
RUN addgroup -S velocity
RUN adduser -S velocity -G velocity
RUN chown velocity:velocity /data

USER velocity

COPY --chown=velocity velocity-*.jar /tmp/velocity.jar
ENTRYPOINT java -Xms$JAVA_MEMORY -Xmx$JAVA_MEMORY $JAVA_FLAGS -jar /tmp/velocity.jar
