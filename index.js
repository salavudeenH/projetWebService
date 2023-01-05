const http = require('http');

var bddList = {
    "foot" : {
        "players" : [
            {
                "name": 'joueur1'
            },
            {
                "name": "joueur2"
            }
        ]
    },
    "basket": {
        "players": []
    }
}

const requestHandler = (req, res) => {
    var path = req.url.split('?')[0];
    if(!path || path =='/'){
        res.writeHead(404, {'Content-type': 'application/json'});
        res.end('{message : "Page not found"}');
    } else {
        // On créer les variables qui nous permettront de savoir sur quelle bdd et/ou table ciblé nos requêtes à partir de l'url 
        path = path.slice(1)
        if(path.includes('/')){
            var BddPath = path.substring(0, path.indexOf('/'));
            if(req.url.split('?')[1]){
                var tablePath = path.substring(path.indexOf('/') + 1);
                tablePath = tablePath.split('?')[0]
                var params = req.url.split('?')[1]
            }else{
                var tablePath = path.substring(path.indexOf('/') + 1);
            }
        }else{
            var BddPath = path;
        }
        
        // Partie permettant de gérer les requêtes de type GET
        if(req.method == 'GET'){
            res.writeHead(200, {'Content-type': 'application/json'});
            if(!bddList[BddPath]){
                res.end('{message : "This Database does not exist !"}');
            }else{
                if(!tablePath){
                    res.end(JSON.stringify(bddList[BddPath]));
                }else{
                    if(!bddList[BddPath][tablePath]){
                        res.end('{message : "This table does not exist in this bdd !"}');
                    }else{
                        if(params){
                            console.log(params)
                        }else{
                            res.end(JSON.stringify(bddList[BddPath][tablePath]))
                        }
                    }
                }
            }    
        }
        // Partie permettant de gérer les requêtes de type POST
        else if(req.method == 'POST'){
            
        }
        // Partie permettant de gérer les requêtes de type PUT
        else if(req.method == 'PUT'){
            
        }
        // Partie permettant de gérer les requêtes de type DELETE
        else if(req.method == "DELETE"){
            
        }
        // Partie permettant de gérer les requêtes dont le type n'est pas géré par notre serveur
        else{
            res.writeHead(404, {'Content-type': 'ext/plain'});
            res.end("Not Found");
        }
    }
}

var serveur = http.createServer(requestHandler);
serveur.listen(8000);