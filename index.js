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

var guilds = {};

client.login(discord_token);

client.on('message', function(message) {
    const args = message.content.split(' ').slice(1).join(" ").toLowerCase();
    if(message.channel.type !== "dm"){
        const mess = message.content.toLowerCase();
        if (!guilds[message.guild.id]) {
            guilds[message.guild.id] = {
                queue: [],
                queueNames: [],
                dispatcher: null,
                voiceChannel: null,
            };
        }
        if (mess.startsWith(prefix + "play")) {
            if (message.member.voiceChannel) {
                if (mess === (prefix + "play"))
                    message.reply("No escribiste el nombre de ninguna canción.");		
                else {
                    if (guilds[message.guild.id].queue.length > 0) {
                            if(isSoundcloud(args))
                                colaSoundCloud(args, message);
                            else
                                colaYoutube(args, message);
                    }
                    else {
                        if(isSoundcloud(args))
                            Soundcloud(message, args);
                        else
                            Youtube(message, args);
                    }
                }
            }
            else
                message.reply(" Necesitas unirte a un canal de voz!");
        }
        else if (mess.startsWith(prefix + "skip")) {
            if(guilds[message.guild.id].dispatcher !== null){
                guilds[message.guild.id].dispatcher.end();
                message.reply(" La canción ha sido saltada!");
            }
        }
        else if (mess.startsWith(prefix + "cola")) {
            var message2 = "```css\n";
            for (var i = 0; i < guilds[message.guild.id].queueNames.length; i++) {
                var temp = (i + 1) + ": " + (i === 0 ? "🔊 " : "") + guilds[message.guild.id].queueNames[i] + "\n";
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
        }
        else if (mess.startsWith(prefix + "salir")) {
            if(guilds[message.guild.id].voiceChannel != null) {
                guilds[message.guild.id].voiceChannel.leave();
                guilds[message.guild.id] = false;
            }
        }
        else if (mess.startsWith(prefix + "comandos")) {
            message.channel.send(
                "📜 Lista de comandos:\n"+
                "```xl\n"+
                "'y!play' Reproducir una canción o añadirla a la cola.\n"+
                "'y!cola' Ver lista de canciones en cola.\n"+
                "'y!skip' Saltar la canción que se está reproduciendo.\n"+
                "'y!salir' Sacar el bot del chat de voz por si no se sale automáticamente."+
                "```"
            );
        }
        else if (mess.startsWith(prefix + "servidores")) {
            var contar_servidores;
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
        }
    }
    else {
        const mess = message.content;
        if(message.author.id !== botid){
            console.log("El bot ha recibido un mensaje privado ("+ message.channel.type +"): ");
            console.log(message.author.tag+": "+mess);
            client.fetchUser(ownerid).then((user) => {
                user.send(message.author.tag+": "+mess);
            });
        }
    }
});

client.on('ready', function() {
    console.log("Estoy listo!");
    client.user.setPresence({
        game: {
            name: "yeezac.yizack.com",
            type: 0
        }
    });
});

function playMusic(message, url) {
    if(isSoundcloud(url)){
        playSoundCloud(message, url);
    }
    else{
        playYoutube(message, url);
    }
}

function play(stream, message){
    guilds[message.guild.id].voiceChannel = message.member.voiceChannel;
    guilds[message.guild.id].voiceChannel.join().then(connection => {
        guilds[message.guild.id].dispatcher = connection.playStream(stream);
        guilds[message.guild.id].dispatcher.on('end', function() {
            guilds[message.guild.id].queue.shift();
            guilds[message.guild.id].queueNames.shift();
            if (guilds[message.guild.id].queue.length === 0) {
                guilds[message.guild.id].queue = [];
                guilds[message.guild.id].queueNames = [];
				guilds[message.guild.id].voiceChannel.leave();
            }
            else {
                setTimeout(function() {
                    playMusic(message, guilds[message.guild.id].queue[0]);
                }, 500);
            }
        });
    }).catch(err => console.log(err));
}

function getID(str, cb) {
    if (isYoutube(str))
        cb(getYouTubeID(str));
    else {
        search_video(str, function(id) {
            cb(id);
        });
    }
}

function agregar_a_cola(titulo, duracion, url, message) {
    message.reply("📢 Has añadido una canción a la cola: ```🎵: " + titulo + "\n⏲️: [" + duracion +  "]\n📽️: " + url + "```");
    guilds[message.guild.id].queueNames.push(titulo + ", ⏲️: [" + duracion + "]");
    guilds[message.guild.id].queue.push(url);
}

function search_video(query, callback) {
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + yt_api_key, function(error, response, body) {
        var json = JSON.parse(body);
        if (!json.items[0])
            callback("3_-a9nVZYjk");
        else
            callback(json.items[0].id.videoId);
    });
}

async function playSoundCloud(message, url){
    let response = await doRequest("http://api.soundcloud.com/resolve.json?url=" + url + "&client_id=" + sc_clientid);
    json = JSON.parse(response)
    var titulo = json.user.username + " - " + json.title;
    var duracion =  tiempo(json.duration / 1000);
    var id = json.id
    reproduciendo(id, titulo, duracion, url, message);
    const stream = "http://api.soundcloud.com/tracks/" + id + "/stream?consumer_key=" + sc_clientid;
    play(stream, message);
}

function playYoutube(message, args){
    getID(args, function(id) {
        fetchVideoInfo(id, function(err, videoInfo) {
            if (err) throw new Error(err);
            var titulo = videoInfo.title;
            var duracion = tiempo(videoInfo.duration);
            var url = videoInfo.url
            reproduciendo(id, titulo, duracion, url, message);
        });
        const stream = ytdl("https://www.youtube.com/watch?v=" + id, {filter: "audioonly"});
        play(stream, message);
    });
}

function colaYoutube(args, message){
    getID(args, function(id) {
        fetchVideoInfo(id, function(err, videoInfo) {
            if (err) throw new Error(err);
            var titulo = videoInfo.title;
            var duracion = tiempo(videoInfo.duration);
            var url = videoInfo.url;
            if(guilds[message.guild.id].queue.indexOf(url) > -1 )
                message.reply("Esa canción ya está en cola, espera a que acabe para escucharla otra vez.");
            else
                agregar_a_cola(titulo, duracion, url, message);
        });
    });
}

async function colaSoundCloud(url, message){
    if(guilds[message.guild.id].queue.indexOf(url) > -1 )
        message.reply("Esa canción ya está en cola, espera a que acabe para escucharla otra vez.");
    else {
        let response = await doRequest("http://api.soundcloud.com/resolve.json?url=" + url + "&client_id="+ sc_clientid);
        if(response != null){
            json = JSON.parse(response);
            if(json.tracks)
                message.reply("Se encontró más de una canción. No están permitidas las playlist.");
            else {
                var titulo = json.user.username + " - " + json.title;
                var duracion = json.duration / 1000;
                var duracion = tiempo(duracion);
                agregar_a_cola(titulo, duracion, url, message);
            }
        }
        else
            message.reply("No se encontro ningúna canción con ese link.");
    }
}

async function Soundcloud(message, url){
    let response = await doRequest("http://api.soundcloud.com/resolve.json?url=" + url + "&client_id=" + sc_clientid);
    if(response != null){
        json = JSON.parse(response);
        if(json.tracks)
            message.reply("Se encontró más de una canción. No están permitidas las playlist.");
        else {
            var titulo = json.user.username + " - " + json.title;
            var duracion =  tiempo(json.duration / 1000);
            guilds[message.guild.id].queue.push(url);
            guilds[message.guild.id].queueNames.push(titulo + ", ⏱️: [" + duracion + "]");
            playMusic(message, url);
        }
    }
    else
        message.reply("No se encontro ningúna canción con ese link.");
}

function Youtube(message, args){
    getID(args, function(id) {
        fetchVideoInfo(id, function(err, videoInfo) {
            if (err) throw new Error(err);
            var titulo = videoInfo.title;
            var duracion = tiempo(videoInfo.duration);
            var url = videoInfo.url;
            guilds[message.guild.id].queue.push(url);
            guilds[message.guild.id].queueNames.push(titulo + ", ⏱️: [" + duracion + "]");
            playMusic(message, url);
        });
    });
}

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
        
    });
}

function reproduciendo(id, titulo, duracion, url, message){
    console.log("ID: "+ id);
    message.channel.send("🔊 Se está reproduciendo:```fix\n🎵: " + titulo + "\n⏲️: [" + duracion +  "]\n📽️: " + url + "```");
    console.log(message.author.tag + " está reproduciendo: " + titulo);
}

function isYoutube(str) {
    return str.indexOf("youtube.com") > -1;
}

function isSoundcloud (str){
    return str.indexOf("soundcloud.com") > -1;
}

function tiempo(time){   
    var hrs = ~~(time / 3600);
    var mins = ~~((time % 3600) / 60);
    var secs = ~~time % 60;
    var ret = "";
    if (hrs > 0) {
        ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
    }
    ret += "" + mins + ":" + (secs < 10 ? "0" : "");
    ret += "" + secs;
    return ret;
}
