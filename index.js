const Telegraf = require('telegraf');
const express = require('express');
const expressApp = express();

/*Nodig voor inline keyboard*/
const Extra = require('./node_modules/telegraf/lib/helpers/extra')
const Markup = require('./node_modules/telegraf/lib/helpers/markup')

const API_TOKEN = process.env.API_TOKEN || '';
const PORT = process.env.PORT || 3000;
const URL = process.env.URL || '';

var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var url = process.env.MONGOLAB_URI;

const bot = new Telegraf(API_TOKEN);

/*Blijkbaar is dit nodig om te kunnen werken in groep/supergroep*/
bot.telegram.getMe().then((botInfo) => {
  bot.options.username = botInfo.username
});
bot.telegram.setWebhook(`${URL}/bot${API_TOKEN}`);
expressApp.use(bot.webhookCallback(`/bot${API_TOKEN}`));

/*
 your bot commands and all the other stuff on here ....
*/
/*Nuttige info*/
/*
gebruiker uit groep verwijderen:
bot.kickChatMember(chatId, userId) => Promise
*/
/*Start van code*/
var fs = require("fs");

/*Variabelen*/
const Code = '7384';	//Code van Biolokaal
const Eten =['Quick eten','Pitta boefen','een Broodje in de cafetaria eten','iets in de Frituur eten','ne pizza hut doen'];
var Score = [];					//Bewaart da scores van elke gebruiker per groep
var BestaatScore = false;		//Controle of score van bepaalde gebruiker in bepaalde groep al bestaat
var Namen = [];
var BestaatNaam = false;
var Bericht = [];				//lege array, wordt automatisch aangemaakt bij eerste bericht
var Bestaat = false;			//controle of bericht van 'hoe just' al in de array staat
var Mokkes = [];				//lege array, wordt gevuld bij /start
var She = [];					//lege array, wordt gevuld bij /start
var Quotes = [];				//lege array, wordt gevuld bij /start
var EmmaW = [];					//lege array, wordt gevuld bij /start
var EmmaS = [];					//lege array, wordt gevuld bij /start
var Gestemd = [];				//Personen die al gestemd hebben bij de quiz
var HeeftGestemd = false;		//Geeft terug of persoon al gestemd heeft in een bepaalde groep
var Start = false;				//Controle of de bot gestart is na downtime
var Antwoord = [];				//0->mokke ; 1->she
var BestaatAntwoord = false;	//Controle of er een antwoord aanwezig is van bepaalde groep
var Spam = false;				//check of iemand de bot wil spammen
var TotaleSpam = 0;				//totaal aantal spams
/*end Variabelen*/

//bot.hears('hi', (ctx) => ctx.reply('Hey there!'))
//bot.on('sticker', (ctx) => ctx.reply('??'))

/***********
* Functies *
************/
function Init(){
	Mokkes = fs.readFileSync("./Data/mokkes.txt").toString().split("\n");
	She = fs.readFileSync("./Data/she.txt").toString().split("\n");
	Quotes = fs.readFileSync("./Data/quotes.txt").toString().split("\n");
	EmmaW = fs.readFileSync("./Data/emmawatson.txt").toString().split("\n");
	EmmaS = fs.readFileSync("./Data/emmastone.txt").toString().split("\n");
	Antwoord = [];
		
	/*Bot is mogelijk gestopt dus scores inladen van DB*/
	GetAllFromDB();
}
/*score zoeken in DB op 'chatid' en 'naamid' => gevonden=true ; niet gevonden=false*/
function FindAndReplaceInDB(ChatId, NaamId, Juist, Fout, Voornaam, Achternaam){
MongoClient.connect(url, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
		console.log('Connection established ');
		// do some work here with the database.
		db.collection('score').findAndModify(
			{chatid: ChatId, naamid: NaamId}, // query
			[],  // sort order
			{$set: {voornaam: Voornaam, achternaam: Achternaam, juist: Juist, fout: Fout}}, // replacement
			{}, // options
			function(err, object) {
				if (err){
					console.warn(err.message);  // returns error if no matching object found
				}else{
					console.log('score gevonden en geupdate');
					console.log(object);
					if (object.value == null){ //Score bestaat nog niet
						console.log('score niet gevonden');
						SendToDB(ChatId, NaamId, Juist, Fout, Voornaam, Achternaam);
					}
				}
			db.close();
		});
	}
});	
}
/*Alle scores van de DB verkrijgen en in Score array zetten*/
function GetAllFromDB(){
MongoClient.connect(url, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
		console.log('Connection established ');
		// do some work here with the database.
		var collection = db.collection('score');
			collection.find().toArray(function (err, result) {
			if (err) {
				console.log(err);
			} else if (result.length) {
				Score = [];
				Score = result;
				console.log(result);
			} else {
				console.log('No document(s) found with defined "find" criteria!');
			}
			//Close connection
		db.close();
		});
	}
});	
}
/*Nieuwe score toevoegen*/
function SendToDB (ChatId, NaamId, Juist, Fout, Voornaam, Achternaam){
MongoClient.connect(url, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
    console.log('Connection established ');
	// do some work here with the database.
    var collection = db.collection('score');
		var user = {voornaam: Voornaam, achternaam: Achternaam, chatid: ChatId, naamid: NaamId, juist: Juist, fout: Fout};
			 // Insert some users
			collection.insert(user, function (err, result) {
			if (err) {
				console.log(err);
			} else {
				//console.log('Inserted %d documents into the "users" collection. The documents inserted with "_id" are:', result.length, result);
			}
    //Close connection
    db.close();
	});
  }
});
}

function UpdateScore (waarde, Voornaam, Achternaam, ChatId, NaamId){	//waarde=0 -> fout antwoord ; waarde=1 -> juist antwoord
	BestaatScore = false;		//eerst vanuitgaan dat score nog niet bestaat, dan controleren
	for (var i=0;i<Score.length;i++){
		if (Score[i].naamid == NaamId && Score[i].chatid == ChatId){
			BestaatScore = true;
			var AantalJuist = Score[i].juist;	//Aantal juist tijdelijk bewaren
			var AantalFout = Score[i].fout;		//Aantal fout tijdelijk beware
			if (waarde == 0){
				AantalFout += 1;
				Score[i].fout = AantalFout;
				Score[i].voornaam = Voornaam;
				Score[i].achternaam = Achternaam;
			}
			else if (waarde == 1){
				AantalJuist += 1;
				Score[i].juist = AantalJuist;
				Score[i].voornaam = Voornaam;
				Score[i].achternaam = Achternaam;
			}
			break;
		}
		else{
			BestaatScore = false;
		}
	}
	if (!BestaatScore){
		if (waarde == 0){
			Score.push({'juist': 0, 'fout': 1, 'voornaam': Voornaam, 'achternaam': Achternaam, 'chatid': ChatId, 'naamid': NaamId});
		}
		else if (waarde == 1){
			Score.push({'juist': 1, 'fout': 0, 'voornaam': Voornaam, 'achternaam': Achternaam, 'chatid': ChatId, 'naamid': NaamId});
		}
	}
	/*Alles wegschrijven naar DB*/
	for (var i=0;i<Score.length;i++){
		/*Zoek score in DB, indien niet bestaat -> toevoegen, indien bestaat -> updaten*/
		FindAndReplaceInDB(Score[i].chatid, Score[i].naamid, Score[i].juist, Score[i].fout, Score[i].voornaam, Score[i].achternaam);
	}	
}
function UpdateAntwoord (Chatid, Waarde){
	BestaatAntwoord = false;
	for (var i=0;i<Antwoord.length;i++){
		if (Antwoord[i].chatid == Chatid){
			Antwoord[i].antwoord = Waarde;
			BestaatAntwoord = true;
			break;
		}
		else{
			BestaatAntwoord = false;
		}
	}
	if (!BestaatAntwoord){
		Antwoord.push({'chatid': Chatid, 'antwoord': Waarde});
	}
}
function UpdateNamen (voornaam, achternaam, naamid){
	BestaatNaam = false;		//eerst vanuitgaan dat Naamid nog niet bestaat, dan controleren
	for (var i=0;i<Namen.length;i++){
		if (Namen[i].naamid == naamid){
			Namen[i].voornaam == voornaam;
			Namen[i].achternaam == achternaam;
			BestaatNaam = true;
			break;
		}
		else{
			BestaatNaam = false;
		}
	}
	if (!BestaatNaam){
		Namen.push({'voornaam': voornaam, 'achternaam': achternaam, 'naamid': naamid});
	}	
}
/*******************************
* Antwoorden bij bepaalde text *
********************************/
/*Bij text 'hoe just' -> vorig bericht herhalen*/
bot.hears(['hoe just','Hoe just','oe just','hoe just?','Hoe just?'], (ctx) => {
	for (var i=0;i<Bericht.length;i++){
		if (Bericht[i].naam == ctx.chat.id){
			return ctx.reply (Bericht[i].bericht);
		}
	}
})

/*Bij text 'code' -> code doorsturen*/
bot.hears(['code','Code'], (ctx) => ctx.reply(Code))

/*Bij text 'wa gaan we doen' -> antwoord versturen*/
bot.hears(['wa gaan we doen','wa gan we doen','wa gaan we doen?','Wa gaan we doen'], (ctx) => ctx.reply('We gaan Bonke natuurlijk!'))

/*Bij text 'wa gaan we eten' -> random sturen wat we gaan eten*/
bot.hears(['wa gaan we eten','wa gan we eten','wa gaan we eten?','Wa gaan we eten'], (ctx) => {
  var x = Math.floor((Math.random() * Eten.length));
  return ctx.reply(`We gaan ${Eten[x]}`);
})

/*Bij 'emma stone -> foto van emma sturen*/
bot.hears(['Emma Stone','emma stone','Emma stone','emma Stone','Emma Stone?','emma stone?','Emma stone?','emma Stone?'], (ctx) => {
	if (!Start){
		Init();
		Start = true;
	}
	var x = Math.floor((Math.random() * EmmaS.length));
	return ctx.replyWithPhoto(EmmaS[x]);		
})

/*Bij ieder tekstbericht*/
bot.on('text', (ctx, next) => {
	const name = ctx.from.first_name;
	const message = ctx.message.text;
	const mess = message.toLowerCase();
	var n = mess.search("emma");
	//als emma voorkomt in de tekst
	if(n!=-1){
		if (!Start){
			Init();
			Start = true;
		}
		var count = (mess.match(/emma/g) || []).length;	//aantal keer emma tellen
		if (count >= 10 && count < 800 && Spam == false){
			ctx.reply(`nene ${name}, ${count} zijn er te veel. Hier hebt ge er al 10 om mee te beginnen`)
			count = 10;	
		}
		else if (count >= 800){
			Spam = true;
			TotaleSpam += count;
			count = 0;
		}
		else if (Spam == true && count < 819){ //Bij laatste bericht van de spam
			Spam = false;
			TotaleSpam += count;
			count = 10;	
			ctx.reply(`nene ${name}, ik ga geen ${TotaleSpam} foto's van ons Emma sturen. Hier hebt ge er al 10 om mee te beginnen`)
			TotaleSpam = 0;
		}
		for (var i=0;i<count;i++){
			var x = Math.floor((Math.random() * 2) );
			switch(x) {
				case 0:
					var y = Math.floor((Math.random() * EmmaW.length) );	
					ctx.replyWithPhoto(EmmaW[y]);
					break;
				case 1:
					var y = Math.floor((Math.random() * EmmaS.length) );	
					ctx.replyWithPhoto(EmmaS[y]);
					break;
				default:
					var y = Math.floor((Math.random() * EmmaW.length) );	
					ctx.replyWithPhoto(EmmaW[y]);
			}						
		}
	}
	Bestaat = false;		//eerst vanuitgaan dat bericht nog niet bestaat, dan controleren
	for (var i=0;i<Bericht.length;i++){
		if (Bericht[i].naam == ctx.chat.id){
			Bericht[i].bericht = ctx.message.text;
			Bestaat = true;
			break;
		}
		else{
			Bestaat = false;
		}
	}
	if (!Bestaat){
		Bericht.push({'naam': ctx.chat.id, 'bericht': ctx.message.text});
	}
	
  if (Math.random() > 0.2) {
    return next()
  }
  return Promise.all([
    //ctx.reply(`STOP ME DIE KIEKENS ${ctx.chat.first_name.toUpperCase()}`), //Bericht dat random kan gestuurd worden
    next()
  ])
})

/*************
* Commando's *
**************/
bot.command('start', (ctx) => {
	ctx.reply('Welkom bij den BonkersBot 3.0! 🍻')
})
bot.command('stop', (ctx) => {
	Start = false;
	ctx.reply('Daag')
	/*Variabelen resetten*/
	Bericht = [];		
	Bestaat = false;	
	Mokkes = [];		
	She = [];		
	Quotes = [];		
	EmmaW = [];
	Score = [];
})
bot.command('get', (ctx) => {
	Chatid = ctx.chat.id;
	if (!Start){
		Init();
		Start = true;
	}
	/*Iedereen in deze groep da gestemd heeft resetten*/
	for (var i=0;i<Gestemd.length;i++){
		if (Gestemd[i].chatid == Chatid){
			Gestemd[i].gestemd = false;
		}
	}
	UpdateNamen(ctx.from.first_name, ctx.from.last_name, ctx.from.id);	//Update Namen array 
	var AntwoordTemp = Math.floor((Math.random() * 2));
	UpdateAntwoord(Chatid,AntwoordTemp);
	if (AntwoordTemp == 0){	//mokke
		var x = Math.floor((Math.random() * Mokkes.length));
		ctx.replyWithPhoto(Mokkes[x]);
	}
	else if (AntwoordTemp == 1){	//she
		var x = Math.floor((Math.random() * She.length));
		ctx.replyWithPhoto(She[x]);
	}
	
	return ctx.reply('Shemale?', Extra.HTML().markup((m) =>
		m.inlineKeyboard([
		m.callbackButton('Ja', 'Ja'),
		m.callbackButton('Nee', 'Nee')
		])))	
})
bot.action(/.+/, (ctx) => {
	var Naamid = ctx.from.id;
	var Voornaam = ctx.from.first_name;
	var Achternaam = ctx.from.last_name;
	var Chatid = ctx.chat.id;
	var Antwoordtemp;
	
	HeeftGestemd = false;	//Eerst vanuitgaan dat persoon nog niet gestemd heeft, hierna controleren
	/*Controle of er al gestemd is*/
	for (var i=0;i<Gestemd.length;i++){
		if (Gestemd[i].naamid == Naamid && Gestemd[i].chatid == Chatid && Gestemd[i].gestemd == true){
			HeeftGestemd = true
			break;
		}
		else{
			HeeftGestemd = false;
		}
	}
	/*Indien er al gestemd is*/
	if (HeeftGestemd == true){
		ctx.answerCallbackQuery('Sorry ge hebt al gekozen')
	}
	/*Indien er niet gestemd is*/
	else{
		Gestemd.push({'naamid': Naamid, 'chatid': Chatid, 'gestemd': true});
		for (var i=0;i<Antwoord.length;i++){
			if (Antwoord[i].chatid == Chatid){
				Antwoordtemp = Antwoord[i].antwoord;
				break;
			}		
		}
		if (Antwoordtemp == 1){
			if (ctx.match[0] == 'Ja'){
				UpdateScore(1,Voornaam,Achternaam,Chatid,Naamid);
				return ctx.answerCallbackQuery('Correct, dit is een shemale')
			}
			else if (ctx.match[0] == 'Nee'){
				UpdateScore(0,Voornaam,Achternaam,Chatid,Naamid);
				return ctx.answerCallbackQuery('Fout, dit is wel degelijk een shemale')
			}
		}
		else if (Antwoordtemp == 0){
			if (ctx.match[0] == 'Ja'){
				UpdateScore(0,Voornaam,Achternaam,Chatid,Naamid);
				return ctx.answerCallbackQuery('Fout, dit is een mokke (schaam u)')
			}
			else if (ctx.match[0] == 'Nee'){
				UpdateScore(1,Voornaam,Achternaam,Chatid,Naamid);
				return ctx.answerCallbackQuery('Correct, dit is een mokke')
			}
		}
	}
})
bot.command('mokke', (ctx) => {
	if (!Start){
		Init();
		Start = true;
	}
	var x = Math.floor((Math.random() * Mokkes.length) );
	ctx.replyWithPhoto(Mokkes[x]);
})
bot.command('shemale', (ctx) => {
	if (!Start){
		Init();
		Start = true;
	}
	var x = Math.floor((Math.random() * She.length) );
	return ctx.replyWithPhoto(She[x]);
})
bot.command('camouflage', (ctx) => {
	if (!Start){
		Init();
		Start = true;
	}	
	for (var i=0;i<25;i++){
		var x = Math.floor((Math.random() * Quotes.length));
		ctx.replyWithPhoto(Quotes[x]);
	}		
})
bot.command('score', (ctx) => {
	if (!Start){
		Init();
		Start = true;
	}	
	var Chat = ctx.chat.id;
	var string = '';
	var NietGespeeld = true;
	var Nummering = 1;
	
	/*maak 1 bericht*/
	for (var i=0;i<Score.length;i++){
		if (Chat == Score[i].chatid){
			var ProcentJuist = (Score[i].juist/(Score[i].juist + Score[i].fout))*100
			string += `${Nummering}.${Score[i].voornaam} ${Score[i].achternaam} \t\t\t	${(ProcentJuist).toFixed(2)}% correct\n`;
			Nummering += 1;
		}
	}
	for (var i=0;i<Score.length;i++){
		if (Chat == Score[i].chatid){
			NietGespeeld = false;
			break;
		}
		else{
			NietGespeeld = true;
		}
	}
	if (NietGespeeld){
		return ctx.reply('Ge moet wel eerst spelen he, start de shemaleQuiz met /get');
	}
	else{
		return ctx.reply(string);
	}	
})
bot.command('scoredetail', (ctx) => {
	if (!Start){
		Init();
		Start = true;
	}	
	var Chat = ctx.chat.id;
	var string = '';
	var NietGespeeld = true;
	var Nummering = 1;
	console.log('ok');
	/*maak 1 bericht*/
	for (var i=0;i<Score.length;i++){
		if (Chat == Score[i].chatid){
			string += `${Nummering}.${Score[i].voornaam} ${Score[i].achternaam} \t\t\t	correct: ${Score[i].juist} ; fout: ${Score[i].fout}\n`;
			Nummering += 1;
		}
	}
	for (var i=0;i<Score.length;i++){
		if (Chat == Score[i].chatid){
			NietGespeeld = false;
			break;
		}
		else{
			NietGespeeld = true;
		}
	}
	if (NietGespeeld){
		ctx.reply('Ge moet wel eerst spelen he, start de shemaleQuiz met /get');
	}
	else{
		return ctx.reply(string);
	}
})
bot.command('test', (ctx) => {
	return ctx.reply('Momenteel niks te testen');
})
/*Einde van code*/




// and at the end just start server on PORT
expressApp.get('/', (req, res) => {
  res.send('Hello World!');
});
expressApp.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});