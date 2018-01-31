var restify = require('restify');
var builder = require('botbuilder');
var buscaCep = require('busca-cep');

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
        session.beginDialog( "init", session.userData.profile );
    }
]).set( 'storage', inMemoryStorage );


bot.dialog( "init", [

    // say hi
    function( session ){
        session.send( "Olá =D <br/>Sou o jóvi das pizzas, bora fazer um pedido e encher a pança?" );
        builder.Prompts.choice( session, "Você já possui cadastro?", "Sim|Não", { listStyle: 2 } );
    },

    // check response
    function( session, results ){
        if( results.response.entity === "Sim" ){
            session.beginDialog( "login" );
        }
        if( results.response.entity === "Não" ){
            session.beginDialog( "singup" );
        }
    }

]);

bot.dialog( "login", [

    // login
    function( session, args ){
        session.dialogData.profile = args || {};
        builder.Prompts.text( session, "Informe o seu CPF:" );
    },
    function( session, results ){
        if( results.response &&
            results.response === "123456" ){

            session.send( "Olá Diego, qual o pedido de hoje? ;)" );
            session.endDialog();

        }else{
            builder.Prompts.confirm( session, "Ops! Usuário não encontrado. <br/> Tentar novamente? ( sim / não )" );
        }
    },
    // check try again
    function( session, results ){
        if( results.response ){
            session.beginDialog( "login" );
        }else{
            session.endDialog( "Ok! Obrigado, até a próxima =)" );
        }
    }

]);

bot.dialog( "singup", [

    // get name
    function( session, args, next ){

        session.dialogData.profile = args || {};

        if( !session.dialogData.profile.name ){
            builder.Prompts.text( session, "Qual o seu nome?" );
        }else{
            next();
        }

    },

    // get adress
    function( session, results, next ){

        if( results.response ){
            session.dialogData.profile.name = results.response;
        }

        if( !session.dialogData.profile.street ){
            builder.Prompts.text( session, "Olá " + session.dialogData.profile.name + " =) <br/> Agora informe o CEP onde será feita a entrega do pedido: ( ex: 02535-015 )" );
        }else{
            next();
        }

    },

    // get street
    function( session, results, next ){

        if( results.response ){
            buscaCep( results.response ).then( function ( response ) {

                var profile = session.dialogData.profile;
                profile.street = response.logradouro;
                profile.neighborhood = response.bairro;
                profile.state = response.uf;
                next();

            }, function( error ){
                console.log( error.statusCode );
            });
        }

    },

    // get number
    function( session ){
        builder.Prompts.number( session, "Qual o número da casa?" );
    },

    // check infos
    function( session, results ){
        if( results.response ){
            var profile = session.dialogData.profile;
            profile.number = results.response;

            builder.Prompts.confirm( session, `Os dados abaixo estão corretos? ( sim / não )<br/>Nome: ${profile.name}<br/>Endereço: ${profile.street}, ${profile.number}, ${profile.neighborhood} - ${profile.state}` );
        }
    },

    // show user infos
    function( session, results ){
        if( results.response ){
            session.send( `Ok ${session.dialogData.profile.name}, vamos ao cardápio agora!` );
            session.endDialog();
        }else{
            session.endDialog( "Fodeu!" );
        }
    }

]);