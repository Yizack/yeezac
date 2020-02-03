const Discord = require("discord.js");
const client = new Discord.Client();
const ytdl = require("ytdl-core");
const request = require("request");
const getYouTubeID = require("get-youtube-id");
const fetchVideoInfo = require("youtube-info");
const config = require("./config.json");

const yt_api_key = config.yt_api_key;
const prefix = config.prefix;
const discord_token = config.discord_token;
const botid = config.botid;
const ownerid = config.ownerid;
const sc_clientid = config.sc_clientid;

let guilds = {};

client.login(discord_token);

client.on('message', function(message) {
    let guild = message.guild.id;
    if(message.channel.type !== "dm") {
        const mess = message.content.toLowerCase();
        const comando = mess.split(" ")[0]; // Extrae el comando
        if (!guilds[guild]) {
            guilds[guild] = {
                queue: [],
                queueNames: [],
                url: [],
                titulo: [],
                duracion: [],
                thumbnail: [],
                autor: [],
                dispatcher: null,
                voiceChannel: null,
                isPlaying: false,
            };
        }
        switch(comando) {
            case prefix + "play":
                if (message.member.voiceChannel) {
                    if (mess === (prefix + "play"))
                        message.reply("No escribiste el nombre de ninguna canción.");		
                    else {
                        const args = message.content.split(/(?:<|(?:>| ))+/).slice(1).join(" "); // Remover comando, espacios y <> del mensaje
                        if(isURL(args.toLowerCase())){  // Si la búsqueda contiene un link
                            if(isSoundcloud(args)) // Si lee un link de soundcloud
                                Soundcloud(args, message); // Soundcloud
                            else if (isYoutube(args)) // Si lee un link de youtube
                                Youtube(args, message); // Youtube
                            else
                                message.reply("No se encontro ningúna canción con ese link.");
                        }
                        else // Si no
                            buscar_video(args, message); // Buscar video en el buscador de youtube
                    }
                }
                else
                    message.reply(" Necesitas unirte a un canal de voz!");
                break;   

            case prefix + "skip":
                if(guilds[guild].queue[0] !== undefined) {
                    message.reply("La canción ha sido saltada!");
                    guilds[guild].dispatcher.end();
                }
                break;

            case prefix + "cola":
                let message2 = "```css\n";
                for (let i = 0; i < guilds[guild].queueNames.length; i++) {
                    let temp = (i + 1) + ": " + (i === 0 ? "🔊 " : "") + guilds[guild].queueNames[i] + "\n";
                    if ((message2 + temp).length <= 2000 - 3)
                        message2 += temp;
                    else {
                        message2 += "```";
                        message.channel.send(message2);
                        message2 = "```";
                    }
                }
                message2 += "```";
                message.channel.send(message2);
                break;

            case prefix + "salir":
                if(guilds[guild].voiceChannel !== null)
                    Salir(message);
                break;

            case prefix + "servidores":
                let contar_servidores;
                switch(client.guilds.size) {
                    case 1:
                        contar_servidores = "He sido invitado a " + client.guilds.size + " servidor.";
                        message.channel.send(contar_servidores);
                        break;
                    default:
                        contar_servidores = "Me han invitado a " + client.guilds.size + " servidores.";
                        message.channel.send(contar_servidores);
                        break;
                }
                console.log(contar_servidores);
                break;

            case prefix + "comandos":
                message.channel.send(
                    "📜 Lista de comandos:\n"+
                    "```xl\n"+
                    "'y!play' Reproducir una canción o añadirla a la cola.\n"+
                    "'y!pausa' Pausar la canción actual.\n"+
                    "'y!resume' Resumir la canción pausada.\n"+
                    "'y!cola' Ver lista de canciones que están en cola de reproducción.\n"+
                    "'y!skip' Saltar canción que se está reproduciendo.\n"+
                    "'y!salir' Sacar el bot del canal de voz.\n"+
                    "'y!servidores' Mostrar la cantidad de servidores que ha sido invitado el bot.\n"+
                    "'y!comandos' Lista de comandos."+
                    "```"
                );
                break;

            case prefix + "pausa":
                if(guilds[guild].isPlaying === true) {
                    message.reply("Has pausado la canción.");
                    guilds[guild].dispatcher.pause();
                    guilds[guild].isPlaying = false;
                }
                break;

            case prefix +"resume":
                if(guilds[guild].queue[0] !== undefined && guilds[guild].isPlaying === false) {
                    setTimeout(function() {
                        message.reply("La canción ha sido resumida.");
                        guilds[guild].dispatcher.resume();
                        guilds[guild].isPlaying = true;
                    }, 500);
                }
                break;
        }
    }
    else { // Si el bot recibe un mensaje directo
        const mess = message.content;
        if(message.author.id !== botid){
            console.log("El bot ha recibido un mensaje privado ("+ message.channel.type +"): ");
            console.log(message.author.tag + ": " + mess);
            client.fetchUser(ownerid).then((user) => {
                user.send(message.author.tag + ": " + mess); // Enviar mensaje privado al dueño del bot
            });
        }
    }
});

client.on('ready', function() {
    console.log("Estoy listo!");
    client.user.setPresence({
        game: {
            name: "yeezac.yizack.com", // Estado del bot
            type: 0
        }
    });
});

client.on('error', function() {
    console.error("Ha ocurrido un error");
});

client.on('resume', function() {
    console.log("Estoy listo otra vez!");
});

// Youtube
function Youtube(args, message) {
    let id = getYouTubeID(args);
    if(!id) {
        if(args.indexOf("playlist") > -1)
            message.reply("Se encontró más de una canción. No están permitidas las playlist.");
        else
            message.reply("No se encontro ningúna canción con ese link.");
    }
    else
        reproducirYoutube(id, message);
}

// Soundcloud
async function Soundcloud(args, message) {
    let guild = message.guild.id;
    let respuesta = await doRequest("http://api.soundcloud.com/resolve.json?url=" + args + "&client_id=" + sc_clientid);
    if(respuesta != null){
        let json = JSON.parse(respuesta);
        if(json.tracks)
            message.reply("Se encontró más de una canción. No están permitidas las playlist.");
        else if (json.id) {
            let titulo = json.user.username + " - " + json.title;
            let duracion =  tiempo(json.duration / 1000);
            let id = json.id;
            let url = json.permalink_url;
            let thumbnail = json.artwork_url;
            let posicion = guilds[guild].queue.length + 1;
            if(guilds[guild].queue.length > 0) { // Si la cola es mayor a 0
                if(guilds[guild].queue.indexOf(id) > -1) // Si ya existe el id de la canción
                    message.reply("Esa canción ya está en cola, espera a que acabe para escucharla otra vez.");
                else
                    agregar_a_cola(message, id, url, titulo, duracion, thumbnail, posicion); // Agrgar canción a la cola
            }
            else { // Si no hay canciones
                Push(message, id, url, titulo, duracion, thumbnail, message.author); // Push canción
                playMusic(message, id, url, titulo, duracion); // Reproducir canción
            }
        }
        else
            message.reply("No se encontro ningúna canción con ese link.");
    }
    else
        message.reply("No se encontro ningúna canción con ese link.");
}

// Buscar video en youtube sin link y obtener el ID para reproducir
async function buscar_video(args, message) {
    let respuesta = await doRequest("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(args) + "&key=" + yt_api_key);
    let json = JSON.parse(respuesta);
    if (!json.items[0])
        message.reply("No se encontro ningúna canción.");
    else {
        let id = json.items[0].id.videoId;
        reproducirYoutube(id, message);
    }
}

function reproducirYoutube(id, message){
    let guild = message.guild.id;
    fetchVideoInfo(id, function(err, videoInfo) {
        if (err)
            message.reply("No se encontro ningúna canción con ese link.");
        else {
            let titulo = videoInfo.title;
            let duracion = tiempo(videoInfo.duration);
            let url = videoInfo.url;
            let thumbnail = videoInfo.thumbnailUrl;
            let posicion = guilds[guild].queue.length + 1;
            if(guilds[guild].queue.length > 0) { // Si la cola es mayor a 0
                if(guilds[guild].queue.indexOf(id) > -1) // Si ya existe el id de la canción
                    message.reply("Esa canción ya está en cola, espera a que acabe para escucharla otra vez.");
                else
                    agregar_a_cola(message, id, url, titulo, duracion, thumbnail, posicion); // Agrgar canción a la cola
            }
            else { // Si no hay canciones
                Push(message, id, url, titulo, duracion, thumbnail, message.author); // Push canción
                playMusic(message, id, url, titulo, duracion); // Reproducir canción
            }
        }
    });
}

// Reproducir música de Soundcloud o Youtube
function playMusic(message, id, url) {
    let stream;
    if(isYoutube(url))
        stream = ytdl("https://www.youtube.com/watch?v=" + id, {filter: 'audioandvideo', quality: "highestaudio", highWaterMark: 1<<25}); // Pasar stream de youtube
    else
        stream = "http://api.soundcloud.com/tracks/" + id + "/stream?consumer_key=" + sc_clientid; // Pasar stream de soundcloud
    play(stream, message); // Reproducir
}

function play(stream, message){
    // Variables de la canción actual
    let guild = message.guild.id;
    let id = guilds[guild].queue[0]; 
    let url = guilds[guild].url[0];
    let titulo = guilds[guild].titulo[0];
    let duracion = guilds[guild].duracion[0];
    let thumbnail = guilds[guild].thumbnail[0];
    let autor = guilds[guild].autor[0];
    reproduciendo(id, url, titulo, duracion, message, thumbnail, autor); // Mostrar canción que se está reproduciendo
    // Verificar canal de voz del usuario
    guilds[guild].voiceChannel = message.member.voiceChannel;
    guilds[guild].voiceChannel.join().then(connection => {
        connection.setMaxListeners(0);
        guilds[guild].isPlaying = true;
        guilds[guild].dispatcher = connection.playStream(stream); // Stream canción
        guilds[guild].dispatcher.on('end', function() { // Cuando se acaba la canción
            Shift(message); // Liberar datos de la canción y pasar la siguiente a la posición 0
            if (guilds[guild].queue.length === 0) // Si no hay más canciones en la cola
                Salir(message); // Salir del canal
            else { // Si hay más canciones
                setTimeout(function() {
                    id = guilds[guild].queue[0]; // Obtener id
                    url = guilds[guild].url[0]; // Obtener url
                    playMusic(message, id, url); // Reproducir música de Soundcloud o Youtube
                }, 500);
            }
        });
        connection.on('error', function() {
            console.error("Se ha perdido la conexión");
            process.exit(1);
        });
    }).catch(err => console.log(err));
}

// Envía la canción que se está reproduciendo
function reproduciendo(id, url, titulo, duracion, message, thumbnail, autor) {
    message.channel.send("🔊 Se está reproduciendo:");
    message.channel.send(message_embed(autor.username + " está reproduciendo", autor.avatarURL, titulo, thumbnail, url, duracion, id, "1 (actual)"));
    console.log("ID: "+ id);
    console.log(message.author.tag + " está reproduciendo: " + titulo);
}

// Agregar canciones a la cola
function agregar_a_cola(message, id, url, titulo, duracion, thumbnail, posicion) {
    message.reply("📢 has añadido una canción a la cola");
    message.channel.send(message_embed("Añadido a cola por: " + message.author.username, message.author.avatarURL, titulo, thumbnail, url, duracion, id, posicion));
    Push(message, id, url, titulo, duracion, thumbnail, message.author); // Push a y!cola
}

// Recibe argumentos del mensaje y retorna true si el mensaje recibido tiene un link de Youtube
function isYoutube(args) {
    return args.indexOf("youtube.com") > -1 || args.indexOf("youtu.be") > -1;
}

// Recibe argumentos del mensaje y retorna true si el mensaje recibido tiene un link de Soundcloud
function isSoundcloud (args) {
    return args.indexOf("soundcloud.com") > -1;
}

// Obtener respuesta del request de un url
async function doRequest(url) {
    return new Promise(function (resolve, reject) {
        request(url, function (error, res, body) {
        if (!error && res.statusCode == 200)
            resolve(body);
        else
            reject(error);
        });
    })
    .catch(function(err) {
        console.log(err);
    });
}

// Recibe tiempo en segundos y retorna tiempo convertido a minutos:segundos o horas:minutos:segundos
function tiempo(time) {   
    let hrs = ~~(time / 3600);
    let mins = ~~((time % 3600) / 60);
    let secs = ~~time % 60;
    let ret = "";
    if (hrs > 0)
        ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
    ret += "" + mins + ":" + (secs < 10 ? "0" : "");
    ret += "" + secs;
    return ret;
}

// Liberar datos de la canción y pasar la siguiente a la posición 0
function Shift(message) {
    let guild = message.guild.id;
    guilds[guild].queue.shift();
    guilds[guild].queueNames.shift();
    guilds[guild].url.shift();
    guilds[guild].titulo.shift();
    guilds[guild].duracion.shift();
    guilds[guild].thumbnail.shift();
    guilds[guild].autor.shift();
}

// Salir del canal de voz y reinicializar las variables de los datos de las canciones
function Salir(message) {
    let guild = message.guild.id;
    guilds[guild].queue = [];
    guilds[guild].queueNames = [];
    guilds[guild].url = [];
    guilds[guild].titulo = [];
    guilds[guild].duracion = [];
    guilds[guild].thumbnail = [];
    guilds[guild].autor = [];
    guilds[guild].voiceChannel.leave();
    guilds[guild].isPlaying = false;
}

// Push canción (Agregar infromación de la canción)
function Push(message, id, url, titulo, duracion, thumbnail, autor) {
    let guild = message.guild.id;
    guilds[guild].queue.push(id);
    guilds[guild].queueNames.push(titulo + ", ⏲️: [" + duracion + "]");
    guilds[guild].url.push(url);
    guilds[guild].titulo.push(titulo);
    guilds[guild].duracion.push(duracion);
    guilds[guild].thumbnail.push(thumbnail);
    guilds[guild].autor.push(autor);
}

// Verificar si es un link
function isURL(args) {
    let url = args.match(/^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/g);
    if (url == null)
        return false;
    else
        return true;
}

function message_embed(str, avatar, titulo, thumbnail, url, duracion, id, posicion){
    const embed = new Discord.RichEmbed()
    .setTitle(titulo)
    .setAuthor(str, avatar)
    .setColor(0x292929)
    .setThumbnail(thumbnail)
    .setURL(url)
    .addField("Duración", duracion, true)
    .addField("ID", id, true)
    .addField('Posición en cola', posicion);
    return embed;
}
