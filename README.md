[![Build Status](https://travis-ci.org/Yizack/yeezac.svg?branch=master)](https://travis-ci.org/Yizack/yeezac)
[![dependencies Status](https://david-dm.org/yizack/yeezac/status.svg)](https://david-dm.org/yizack/yeezac)
# Yeezac
Bot de música para Discord con Node.js

## Requerimientos Generales
- Crear [Discord Bot](https://discordapp.com/developers/applications/)
- Habilitar [Youtube API](https://console.developers.google.com/)
- Crear [SoundCloud APP](https://soundcloud.com/you/apps) (No disponible, ver:  [SoundCloud  Developers](https://developers.soundcloud.com/))

### Configuración General
- Invita el bot a tu servidor de Discord accediendo en\
`https://discordapp.com/oauth2/authorize?client_id=XXXXXXXXXXXXXXXXXX&scope=bot&permissions=301296759`. \
Reemplaza `XXXXXXXXXXXXXXXXXX` por el **Client ID** del Discord Bot.
- Editar `config.json`
  - `discord_token` Reemplazar `bot token` con el token del Discord Bot.
  - `botid` Reemplazar `id del bot` con el id del Discord Bot.
  - `prefix` Reemplazar `y!` con el prefijo que desees para ejecutar un comando en Discord.
  - `yt_api_key` Reemplazar `api key de youtube` con la api key de Youtube.
  - `ownerid` Reemplazar `tu discord id` con tu Discord ID.
  - `sc_clientid` Reemplazar `tu soundcloud client id` con tu Client ID de la app de tu SoundCloud.
##

## Opción 1. Instalar en una PC local (Windows)
### Requerimientos
- Descargar e Instalar [Node.js](https://nodejs.org/)

### Configurar
- Abrir `cmd.exe` en Windows.
- Ejecutar `cd\` para ir a la raíz del disco local.
- Ejecutar para ir al directorio donde están los archivos del Discord Bot. Ejemplo `cd %USERPROFILE%\Documents\DiscordBot`
- Ejecutar `npm install --save` para instalar dependencies.
- Ejecutar `npm install ffmpeg-binaries --save` para instalar la librería ffmpeg.
- Ejecutar `node index.js` para activar el Discord Bot.
##

## Opción 2. Instalar en Heroku (Windows)
### Requerimientos
- Registro en [Heroku](https://heroku.com/)
- Crear [Heroku App](https://dashboard.heroku.com/new-app)
- Descargar e Instalar [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
- Descargar e Instalar [Git](https://git-scm.com/downloads)

### Configurar
- Asignar nombre a la app en Heroku.
- Ir a la pestaña **Settings** de tu Heroku App, en el botón **Add Buildpack**:
  - Agrega un buildpack, selecciona la opcion `nodejs` y presiona **Save Changes** para instalar Node.js en Heroku.
  - Agrega otro buildpack, ingresa el siguiente URL `https://github.com/issueapp/heroku-buildpack-ffmpeg` y presiona **Save Changes** para instalar la librería ffmpeg compatible con Heroku.
- Abrir `cmd.exe` en Windows.
- Ejecutar `heroku login` y presiona cualquier tecla que no sea `q` para iniciar sesión.
- Ejecutar `cd\` para ir a la raíz del disco local.
- Ejecutar para ir al directorio donde están los archivos del Discord Bot. Ejemplo `cd %USERPROFILE%\Documents\DiscordBot`
- Ejecutar `git init` para inicializar los archivos **.git**
- Ejecutar `heroku git:remote -a nombredelaapp` para controlar tu Heroku App. Reemplaza `nombredelaapp` por el nombre que le asignaste a tu Heroku App.
- Ejecutar `git add .` para añadir los archivos del Discord Bot a Heroku.
- Ejecutar `git commit -am "make it better"` para guardar los cambios
- Ejecutar `git push heroku master` subir los archivos a Heroku.
- Ejecutar `heroku ps:scale worker=1` para activar el Discord Bot 24/7.
##

## Uso
| Comando | Descripción
|---------|-------------|
| `y!play` | Reproduce una canción de Youtube o SoundCloud. |
| `y!cola` | Canciones que están en cola de reproducción. |
| `y!skip` | Saltar la canción que se está reproduciendo. |
| `y!salir` | El Discord Bot sale de el canal de voz. |
| `y!servidores` | Cantidad de servidores que ha sido invitado el bot. |
| `y!comandos` | Lista de comandos. |
##

## Sugerencias, preguntas o problemas
Si tienes sugerencias, preguntas o algún problema, no dudes en escribeme en [@Yizack](https://github.com/Yizack/yeezac/issues/new).
