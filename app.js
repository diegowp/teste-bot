var restify = require('restify');
var builder = require('botbuilder');

// Setup Restify Server
var server = restify.createServer();
server.listen( process.env.port || process.env.PORT || 3979, function(){
    console.log( "%s listening to %s", server.name, server.url );
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector( {
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
} );

// Listen for messages from users
server.post( '/api/messages', connector.listen() );

// Store infos
var inMemoryStorage = new builder.MemoryBotStorage();

// Recive messages from teh user and respond by echoing each message back ( prefixed with 'You said: ' )
var bot = new builder.UniversalBot( connector, [
    function(session){
        session.send( "E ai manolo! Sou o cara da pizza, tu vai querer o que hoje?" );
        builder.Prompts.choice( session, "Escolhe a porcaria do sabor jão!", "Mussarela|Tomate|Não quero nada", { listStyle: 2 } );
    },
    function( session, results ){
        session.dialogData.pizza = results.response.entity;
        builder.Prompts.confirm( session, "Tu tem certeza que vai querer " + results.response.entity + "? ( yes / no )" );
    },
    function( session, results ){

        if( results.response ){
            session.send( "Fecho irmão, é nóiz, logo menos ta na tua casa! <br/>Vlw <br/>Flw" );
            session.endDialog();
        }else{
            session.send( "Então vai ver se estou na esquina irmão, vai se lascar!" );
            session.endDialog();
        }

    }
]).set( 'storage', inMemoryStorage );