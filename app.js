var restify = require('restify');
var builder = require('botbuilder');
var buscaCep = require('busca-cep');
var http = require('request');

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
            session.replaceDialog( "menu" );
        }
        if( results.response.entity === "Não" ){
            session.replaceDialog( "singup" );
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
            session.replaceDialog( "login" );
        }else{
            session.endConversation( "Ok! Obrigado, até a próxima =)" );
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
            session.replaceDialog( "menu" );
        }else{
            session.endConversation( "Fodeu!" );
        }
    }

]);

function createHeroCard( session, name, ingredients, price, image ){

    return new builder.HeroCard( session )
        .title( name )
        .subtitle( ingredients )
        .text( price )
        .images( [
            builder.CardImage.create( session, image )
        ])
        .buttons([
            builder.CardAction.imBack( session, "teste1", "Adicionar" )
        ]);

}

bot.dialog( "teste1", function ( session ) {
        console.log( "ta rolando =====================" );
        session.endConversation( "e aew jão" );
}).triggerAction({
    matches: /ˆteste1$/i
});

bot.dialog( "menu", [

    function( session ){

        http( 'http://localhost:8888/bot/menu.json', function( error, response, body ){

            var items = JSON.parse( body ),
                i = 0;

            var temp = new builder.Message( session );
            temp.attachmentLayout( builder.AttachmentLayout.carousel );

            for( i; i < items.length; i++ ){

                temp.addAttachment( createHeroCard( session, items[i].name, items[i].ingredients, items[i].price, items[i].image ) );

            }

            session.endDialog( temp );

        });

    }

]);