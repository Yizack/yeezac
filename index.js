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

var guilds = {};

client.login(discord_token);

client.on('message', function(message) {
    const member = message.member;
    const args = message.content.split(' ').slice(1).join(" ");
	if(message.channel.type !== "dm"){
		const mess = message.content.toLowerCase();
		if (!guilds[message.guild.id]) {
			guilds[message.guild.id] = {
				queue: [],
				queueNames: [],
				isPlaying: false,
				dispatcher: null,
				voiceChannel: null,
				skipReq: 0,
				skippers: [],
			};
		}

        if (mess.startsWith(prefix + "play")) {
            if (message.member.voiceChannel) {
                if(mess === (prefix + "play")){
                    message.reply("No escribiste el nombre de ninguna canción.");
                }		
                else{
                    if (guilds[message.guild.id].queue.length > 0 || guilds[message.guild.id].isPlaying) {
                        getID(args, function(id) {
                            add_to_queue(id, message);
                            fetchVideoInfo(id, function(err, videoInfo) {
                                if (err) throw new Error(err);
                                message.reply("📢 Has añadido una canción a la cola: ```🎵: " + videoInfo.title + "\n⏲️: [" + duracion(videoInfo.duration) +  "]\n📽️: " + videoInfo.url + "```");
                                guilds[message.guild.id].queueNames.push(videoInfo.title + ", ⏲️: [" + duracion(videoInfo.duration) + "]");
                            });
                        });
                    } else {
                        isPlaying = true;
                        getID(args, function(id) {
                            guilds[message.guild.id].queue.push(id);
                            fetchVideoInfo(id, function(err, videoInfo) {
                                if (err) throw new Error(err);
                                guilds[message.guild.id].queueNames.push(videoInfo.title + ", ⏱️: [" + duracion(videoInfo.duration) + "]");
                            });
                            playMusic(id, message);
                        });
                    }
                }
            } else {
                message.reply(" Necesitas unirte a un canal de voz!");
            }
        } else if (mess.startsWith(prefix + "skip")) {
                guilds[message.guild.id].skippers.push(message.author.id);
                guilds[message.guild.id].skipReq++;
                skip_song(message);
                message.reply(" La canción ha sido saltada!");
        } else if (mess.startsWith(prefix + "cola")) {
            var message2 = "```css\n";
            for (var i = 0; i < guilds[message.guild.id].queueNames.length; i++) {
                var temp = (i + 1) + ": " + (i === 0 ? "🔊 " : "") + guilds[message.guild.id].queueNames[i] + "\n";
                if ((message2 + temp).length <= 2000 - 3) {
                    message2 += temp;
                } else {
                    message2 += "```";
                    message.channel.send(message2);
                    message2 = "```";
                }
            }
            message2 += "```";
            message.channel.send(message2);
        }
        else if (mess.startsWith(prefix + "reparar")) {
            if(guilds[message.guild.id].voiceChannel != null){
                guilds[message.guild.id].voiceChannel.leave();
                sleep(100);
                guilds[message.guild.id].voiceChannel.join();
            }
        }
        else if (mess.startsWith(prefix + "salir")) {
            if(guilds[message.guild.id].voiceChannel != null){
                guilds[message.guild.id].voiceChannel.join();
                sleep(100);
                guilds[message.guild.id].voiceChannel.leave();
                guilds[message.guild.id].queue = [];
            }
        }
        else if (mess.startsWith(prefix + "comandos")) {
            message.channel.send(	"📜 Lista de comandos:\n"+
                                    "```xl\n"+
                                    "'y!play' Reproducir una canción o añadirla a la cola.\n"+
                                    "'y!cola' Ver lista de canciones en cola.\n"+
                                    "'y!skip' Saltar la canción que se está reproduciendo.\n"+
                                    "'y!reparar' Reparar el bot por si no quiere reproducir las canciones (Se eliminarán todas las canciones en la cola).\n"+
                                    "'y!salir' Sacar el bot del chat de voz por si no se sale automáticamente."+"```");
        }
    }
    else{
		const mess = message.content;
        console.log("El bot ha recibido un mensaje privado ("+ message.channel.type +"): ");
        console.log(message.author.tag+": "+mess);
    }
});

client.on('ready', function() {
    console.log("Estoy listo!");
	client.user.setPresence({
        game: {
        name: "yeezac.herokuapp.com",
        type: 0
        }
    });
});

function skip_song(message) {
    guilds[message.guild.id].dispatcher.end();
}

function playMusic(id, message) {
	fetchVideoInfo(id, function(err, videoInfo) {
        if (err) throw new Error(err);
		console.log("ID: "+id);
		message.channel.send("🔊 Se está reproduciendo:```fix\n🎵: " + videoInfo.title + "\n⏲️: [" + duracion(videoInfo.duration) +  "]\n📽️: " + videoInfo.url + "```");
		console.log(message.author.tag + " está reproduciendo: " + videoInfo.title);
    });
    guilds[message.guild.id].voiceChannel = message.member.voiceChannel;
    guilds[message.guild.id].voiceChannel.join().then(connection => {
        const stream = ytdl("https://www.youtube.com/watch?v=" + id, {
            filter: "audioonly"
        });
        guilds[message.guild.id].skipReq = 0;
        guilds[message.guild.id].skippers = [];
        guilds[message.guild.id].dispatcher = connection.playStream(stream);
        guilds[message.guild.id].dispatcher.on('end', function() {
            guilds[message.guild.id].skipReq = 0;
            guilds[message.guild.id].skippers = [];
            guilds[message.guild.id].queue.shift();
            guilds[message.guild.id].queueNames.shift();
            if (guilds[message.guild.id].queue.length === 0) {
                guilds[message.guild.id].queue = [];
                guilds[message.guild.id].queueNames = [];
                guilds[message.guild.id].isPlaying = false;
				guilds[message.guild.id].voiceChannel.leave();
            } else {
                setTimeout(function() {
                    playMusic(guilds[message.guild.id].queue[0], message);
                }, 500);
            }
        });
    }).catch(err => console.log(err));;
}

function getID(str, cb) {
    if (isYoutube(str)) {
        cb(getYouTubeID(str));
    } else {
        search_video(str, function(id) {
            cb(id);
        });
    }
}

function add_to_queue(strID, message) {
    if (isYoutube(strID)) {
        guilds[message.guild.id].queue.push(getYouTubeID(strID));
    } else {
        guilds[message.guild.id].queue.push(strID);
    }
}

function search_video(query, callback) {
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + yt_api_key, function(error, response, body) {
        var json = JSON.parse(body);
        if (!json.items[0]) callback("3_-a9nVZYjk");
        else {
            callback(json.items[0].id.videoId);
        }
    });
}

function isYoutube(str) {
    return str.toLowerCase().indexOf("youtube.com") > -1;
}

function duracion(time){   
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

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
