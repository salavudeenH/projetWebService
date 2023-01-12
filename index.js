const http = require('http');
const fs = require("fs");

var rawdata = fs.readFileSync('./bddFiles/index.json');
var listBDD = JSON.parse(rawdata);

for (let i = 0; i < listBDD["bdd"].length; i++) {
    var bddContentSchemas = fs.readFileSync('./bddFiles/schemas/' + listBDD["bdd"][i] + '_schemas.json');
    var bddContentDatas = fs.readFileSync('./bddFiles/datas/' + listBDD["bdd"][i] + '_datas.json');
    eval('var ' + listBDD["bdd"][i] + '_schemas = ' + bddContentSchemas + ';');
    eval('var ' + listBDD["bdd"][i] + '_datas = ' + bddContentDatas + ';');
}

function checkVariableExist(BddPath, type){
    try{
        let check = eval(BddPath + type);
        if(check){
            return true;
        }
    }catch(e){
        return false;
    }
}

const requestHandler = (req, res) => {
    var path = req.url.split('?')[0];
    if(!path || path =='/'){
        res.writeHead(200, {'Content-type': 'application/json'});
        res.end(JSON.stringify(listBDD));
    } else {
        // On créer les variables qui nous permettront de savoir sur quelle bdd et/ou table ciblé nos requêtes à partir de l'url 
        path = path.slice(1);
        if(path.includes('/')){
            var BddPath = path.substring(0, path.indexOf('/'));
            if(req.url.split('?')[1]){
                var tablePath = path.substring(path.indexOf('/') + 1);
                tablePath = tablePath.split('?')[0];
                var params = req.url.split('?');
            }else{
                var tablePath = path.substring(path.indexOf('/') + 1);
            }
        }else{
            var BddPath = path;
        }
        
        // Partie permettant de gérer les requêtes de type GET
        if(req.method == 'GET'){
            if(!path || path =='/'){
                res.writeHead(200, {'Content-type': 'application/json'});
                res.end(JSON.stringify(listBDD));
            }else{
                res.writeHead(200, {'Content-type': 'application/json'});
                if(checkVariableExist(BddPath, '_datas') === false){
                    res.end('{message : "This Database does not exist !"}');
                }else{
                    if(!tablePath){
                        res.end(JSON.stringify(eval(BddPath+'_schemas')));
                    }else{
                        if(tablePath.includes('/')){
                            res.writeHead(404, {'Content-type': 'ext/plain'});
                            res.end("Not Found");
                        }else if(!eval(BddPath+'_datas')[tablePath]){
                            res.end('{message : "This table does not exist in this bdd !"}');
                        }else{
                            if(params){
                                console.log(params);
                            }else{
                                res.end(JSON.stringify(eval(BddPath+'_datas')[tablePath]));
                            }
                        }
                    }
                }    
            }
        }
        // Partie permettant de gérer les requêtes de type POST
        else if(req.method == 'POST'){
            if(!tablePath){
                if(listBDD["bdd"].indexOf(BddPath) == -1){
                    // Création d'une nouvelle base de données

                    listBDD["bdd"].push(BddPath);
                    
                    fs.writeFileSync("./bddFiles/index.json", JSON.stringify(listBDD, null, 2));
                    fs.writeFileSync("./bddFiles/datas/" + BddPath + "_datas.json", "{}");
                    fs.writeFileSync("./bddFiles/schemas/" + BddPath + "_schemas.json", "{}");

                    var bddContentSchemas = fs.readFileSync('./bddFiles/schemas/' + BddPath + '_schemas.json');
                    var bddContentDatas = fs.readFileSync('./bddFiles/datas/' + BddPath + '_datas.json');
                    eval('var ' + BddPath + '_schemas = ' + bddContentSchemas + ';');
                    eval('var ' + BddPath + '_datas = ' + bddContentDatas + ';');

                    res.end(`{message : "Database ` + BddPath +` is correctly created !"}`);
                }else {
                    res.end('{message : "This name is already used by a bdd !"}');
                }
            }else{
                // Partie permettant de gérer la création d'une table
                if(tablePath.includes('/')){
                    var lastPart = tablePath.substring(tablePath.indexOf('/') + 1);
                    tablePath = tablePath.substring(0, tablePath.indexOf('/'));
                    if(lastPart == 'create'){
                        if(checkVariableExist(BddPath, "_datas") === false){
                            res.end(`{message : "Database ` + BddPath +` does not exist !"}`);
                        }else if(!eval(BddPath+'_schemas')[tablePath]){
                            res.end(`{message : "Table ` + tablePath +` does not exist in this database !"}`);
                        }else{
                            var schema = eval(BddPath+'_schemas')[tablePath];
                            var keys = [];
                            for(var k in schema){
                                if(k != "id"){
                                    keys.push(k);
                                }
                            }
                            keys
                            var body = '';
                            req.on('data', function(data){
                                body += data.toString();
                            });

                            req.on('end', function(){
                                body = JSON.parse(body)
                                var error = [];
                                for(var i = 0; i < keys.length; i++){
                                    var required = schema[keys[i]].required;
                                    var type = schema[keys[i]].type;
                                    var value = body[keys[i]];
                                    console.log(required, type, value);
                                }
                            });
                        }
                    }else{
                        res.writeHead(404, {'Content-type': 'ext/plain'});
                        res.end("Not Found");
                    }
                }else if(checkVariableExist(BddPath, '_schemas') === false){
                    res.end(`{message : "Database ` + BddPath +` does not exist !"}`);
                }else if(eval(BddPath+'_schemas')[tablePath]){
                    res.end(`{message : "Table ` + tablePath +` already exist in the database ` + BddPath + ` !"}`);
                }else{
                    var schemasFile = eval(BddPath+'_schemas');
                    var datasFile = eval(BddPath+'_datas');
                    var body = '';
                    req.on('data', function(data){
                        body += data.toString();
                    });

                    req.on('end', function(){
                        schemasFile[tablePath] = JSON.parse(body);
                        schemasFile[tablePath]['id'] = { type: 'number', required: true };
                        datasFile[tablePath] = {};

                        fs.writeFileSync("./bddFiles/schemas/" + BddPath + "_schemas.json", JSON.stringify(schemasFile,null,2));
                        fs.writeFileSync("./bddFiles/datas/" + BddPath + "_datas.json", JSON.stringify(datasFile,null,2));

                        res.end(`{message : "Table ` + tablePath +` correctly created !"}`);
                    })
                }
            }
        }
        // Partie permettant de gérer les requêtes de type PUT
        else if(req.method == 'PUT'){
            if(!tablePath){
                res.writeHead(404, {'Content-type': 'ext/plain'});
                res.end("Not Found");
            }else{
                
            }
            
        }
        // Partie permettant de gérer les requêtes de type DELETE
        else if(req.method == "DELETE"){
            // Partie permettant de supprimer une bdd
            if(!tablePath){
                delete eval(BddPath+"_schemas");
                delete eval(BddPath+"_datas");
                fs.unlinkSync("./bddFiles/schemas/" + BddPath + "_schemas.json");
                fs.unlinkSync("./bddFiles/datas/" + BddPath + "_datas.json");
                var index = listBDD["bdd"].indexOf(BddPath);
                listBDD["bdd"].splice(index, 1);
                fs.writeFileSync("./bddFiles/index.json", JSON.stringify(listBDD, null, 2));
                res.end(`{message : "Database ` + BddPath +` is correctly deleted !"}`);
            }else{
                // Partie permettant de supprimer une table
                if(!params){
                    var schemasFile = eval(BddPath+'_schemas');
                    var datasFile = eval(BddPath+'_datas');
                    delete schemasFile[tablePath];
                    delete datasFile[tablePath];
                }else{

                }
            }
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