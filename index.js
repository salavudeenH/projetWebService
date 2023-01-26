const http = require("http");
const fs = require("fs");

var rawdata = fs.readFileSync("./bddFiles/index.json");
var listBDD = JSON.parse(rawdata);

for (let i = 0; i < listBDD["bdd"].length; i++) {
  var bddContentSchemas = fs.readFileSync(
    "./bddFiles/schemas/" + listBDD["bdd"][i] + "_schemas.json"
  );
  var bddContentDatas = fs.readFileSync(
    "./bddFiles/datas/" + listBDD["bdd"][i] + "_datas.json"
  );
  eval("var " + listBDD["bdd"][i] + "_schemas = " + bddContentSchemas + ";");
  eval("var " + listBDD["bdd"][i] + "_datas = " + bddContentDatas + ";");
}

var change = false;
async function save () {
  if(change){
    fs.writeFileSync(
      "./bddFiles/index.json",
      JSON.stringify(listBDD, null, 2)
    );
    for (let i = 0; i < listBDD["bdd"].length; i++) {
      var schemasPath = "./bddFiles/schemas/" + listBDD["bdd"][i] + "_schemas.json";
      var datasPath = "./bddFiles/datas/" + listBDD["bdd"][i] + "_datas.json";
      fs.writeFileSync(
        schemasPath,
        JSON.stringify(eval(listBDD["bdd"][i] + "_schemas"), null, 2)
      );
      fs.writeFileSync(
        datasPath,
        JSON.stringify(eval(listBDD["bdd"][i] + "_datas"), null, 2)
      );
    }
    change = false;
  }
}
setInterval(function() { save(); }, 300000);

function checkVariableExist(BddPath, type) {
  try {
    let check = eval(BddPath + type);
    if (check) {
      return true;
    }
  } catch (e) {
    return false;
  }
}

const requestHandler = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");
  res.setHeader('Cache-Control', 'no-cache');
  var path = req.url.split("?")[0];

  // On créer les variables qui nous permettront de savoir sur quelle bdd et/ou table ciblé nos requêtes à partir de l'url
  path = path.slice(1);
  if (path.includes("/")) {
    var BddPath = path.substring(0, path.indexOf("/"));
    if (req.url.split("?")[1]) {
      var tablePath = path.substring(path.indexOf("/") + 1);
      tablePath = tablePath.split("?")[0];
      var params = req.url.split("?")[1];
      if(params){
        params = params.split("&");
        var result = {}
        for(var i = 0; i < params.length; i++){
          var separation = params[i].split("=")
          result[separation[0]] = separation[1]
        }
      }
      params = result
    } else {
      var tablePath = path.substring(path.indexOf("/") + 1);
    }
  } else {
    var BddPath = path;
  }

  // Partie permettant de gérer les requêtes de type GET
  if (req.method == "GET") {
    if (!path || path == "/") {
      res.writeHead(200, { "Content-type": "application/json" });
      res.end(JSON.stringify(listBDD));
    } else {
      if (checkVariableExist(BddPath, "_datas") === false) {
        res.writeHead(500, { "Content-type": "application/json" });
        res.end('{message : "This Database does not exist !"}');
      } else {
        if (!tablePath) {
          res.writeHead(200, { "Content-type": "application/json" });
          res.end(JSON.stringify(eval(BddPath + "_schemas")));
        } else {
          if (tablePath.includes("/")) {
            res.writeHead(404, { "Content-type": "ext/plain" });
            res.end("Not Found");
          } else if (!eval(BddPath + "_datas")[tablePath]) {
            res.writeHead(500, { "Content-type": "application/json" });
            res.end('{message : "This table does not exist in this bdd !"}');
          } else {
            if (params) {
              var objet = ""
              if(params["id"]){
                eval(BddPath + "_datas")[tablePath].map(function(e) {
                  if(params["id"] == e.id) {
                      objet = e;
                  }
                });
                if(objet){
                  res.writeHead(200, { "Content-type": "application/json" });
                  res.end(JSON.stringify(objet));
                }else{
                  res.writeHead(500, { "Content-type": "application/json" });
                  res.end('{message : "No '+ tablePath +' with this id found !"}');
                }
              }else{
                var keys = Object.keys(params)
                var listObjects = []
                for(var i=0; i < keys.length; i++){
                  eval(BddPath + "_datas")[tablePath].map(function(e) {
                    if(params[keys[i]] == e[keys[i]]) {
                      if(!listObjects.includes(e)){
                        listObjects.push(e);
                      }
                    }else {
                      if(listObjects.includes(e)){
                        var index = listObjects.indexOf(e)
                        listObjects.splice(index, 1)
                      }
                    }
                  });
                }
                res.writeHead(200, { "Content-type": "application/json" });
                res.end(JSON.stringify(listObjects));
              }
            } else {
              res.writeHead(200, { "Content-type": "application/json" });
              res.end(JSON.stringify(eval(BddPath + "_datas")[tablePath]));
            }
          }
        }
      }
    }
  }
  // Partie permettant de gérer les requêtes de type POST
  else if (req.method == "POST") {
    if (!tablePath) {
      if (listBDD["bdd"].indexOf(BddPath) == -1) {
        // Création d'une nouvelle base de données

        listBDD["bdd"].push(BddPath);
        eval("globalThis." + BddPath + "_schemas = {};");
        eval("globalThis." + BddPath + "_datas = {};");
        change = true;
        res.end(
          `{message : "Database ` + BddPath + ` is correctly created !"}`
        );
      } else {
        res.end('{message : "This name is already used by a bdd !"}');
      }
    } else {
      // Partie permettant de gérer la création d'une table
      if (tablePath.includes("/")) {
        var lastPart = tablePath.substring(tablePath.indexOf("/") + 1);
        tablePath = tablePath.substring(0, tablePath.indexOf("/"));
        if (lastPart == "create") {
          // Création d'un objet dans la table
          if (checkVariableExist(BddPath, "_datas") === false) {
            res.end(
              `{message : "Database ` + BddPath + ` does not exist !"}`
            );
          } else if (!eval(BddPath + "_schemas")[tablePath]) {
            res.end(
              `{message : "Table ` +
                tablePath +
                ` does not exist in this database !"}`
            );
          } else {
            var schema = eval(BddPath + "_schemas")[tablePath];
            var datas = eval(BddPath + "_datas")[tablePath];
            var keys = [];
            for (var k in schema) {
              if (k != "id") {
                keys.push(k);
              }
            }
            keys;
            var body = "";
            req.on("data", function (data) {
              body += data.toString();
            });

            req.on("end", function () {
              body = JSON.parse(body);
              var errors = [];
              var objet = {};
              for (var i = 0; i < keys.length; i++) {
                  var required = schema[keys[i]].required;
                  var type = schema[keys[i]].type;
                  var value = body[keys[i]];
                  if(!value){
                      if(required == true){
                          errors.push('Le champ ' + keys[i] + ' ne peut pas être vide !');
                      }
                  }else{
                      if(typeof value != type){
                          errors.push('Le champ ' + keys[i] + ' doit être au format ' + type + ' !')
                      }else{
                          objet[keys[i]] = value
                      }
                  }
              }
              if(errors.length == 0){
                var maxId = 0;
                datas.map(function(e) {
                    if(e.id > maxId) {
                        maxId = e.id;
                    }
                })
                objet["id"] = maxId + 1;
                eval(BddPath + '_datas')[tablePath].push(objet);
                change = true;
                res.writeHead(200, { "Content-type": "application/json" });
                res.end(JSON.stringify(eval(BddPath + '_datas')));
              }else{
                res.writeHead(500, { "Content-type": "application/json" });
                res.end(JSON.stringify(errors));
              }
            });
          }
        } else {
          res.writeHead(404, { "Content-type": "ext/plain" });
          res.end("Not Found");
        }
      } else if (checkVariableExist(BddPath, "_schemas") === false) {
        res.end(`{message : "Database ` + BddPath + ` does not exist !"}`);
      } else if (eval(BddPath + "_schemas")[tablePath]) {
        res.end(
          `{message : "Table ` +
            tablePath +
            ` already exist in the database ` +
            BddPath +
            ` !"}`
        );
      } else {
        // Création d'une table
        var schemasFile = eval(BddPath + "_schemas");
        var datasFile = eval(BddPath + "_datas");
        var body = "";
        req.on("data", function (data) {
          body += data.toString();
        });

        req.on("end", function () {
          schemasFile[tablePath] = JSON.parse(body);
          schemasFile[tablePath]["id"] = { type: "number", required: true };
          datasFile[tablePath] = [];

          change = true;

          res.end(
            `{message : "Table ` + tablePath + ` correctly created !"}`
          );
        });
      }
    }
  }
  // Partie permettant de gérer les requêtes de type PUT
  else if (req.method == "PUT") {
    if (!tablePath || !params["id"]) {
      res.writeHead(404, { "Content-type": "ext/plain" });
      res.end("Not Found");
    } else {
      var schema = eval(BddPath + "_schemas")[tablePath];
      var datas = eval(BddPath + "_datas")[tablePath];
      var keys = [];
      for (var k in schema) {
        keys.push(k);
      }
      var body = "";
      req.on("data", function (data) {
        body += data.toString();
      });

      req.on("end", function () {
        body = JSON.parse(body);
        var errors = [];
        var objet = {};
        for (var i = 0; i < keys.length; i++) {
          var required = schema[keys[i]].required;
          var type = schema[keys[i]].type;
          var value = body[keys[i]];
          if(!value){
              if(required == true){
                  errors.push('Le champ ' + keys[i] + ' ne peut pas être vide !');
              }
          }else{
              if(typeof value != type){
                  errors.push('Le champ ' + keys[i] + ' doit être au format ' + type + ' !')
              }else{
                  objet[keys[i]] = value
              }
          }
        }
        if(errors.length == 0){
          eval(BddPath + '_datas')[tablePath].map(function(e, index) {
            if(params["id"] == e.id) {
              eval(BddPath + '_datas')[tablePath][index] = objet;
            }
          });
          change = true;
          res.writeHead(200, { "Content-type": "application/json" });
          res.end(JSON.stringify(eval(BddPath + '_datas')));
        }else{
          res.writeHead(500, { "Content-type": "application/json" });
          res.end(JSON.stringify(errors));
        }
      });
    }
  }
  // Partie permettant de gérer les requêtes de type DELETE
  else if (req.method == "DELETE") {
    // Partie permettant de supprimer une bdd
    if(checkVariableExist(BddPath, "_schemas") == false){
      res.writeHead(500, { "Content-type": "application/json" });
      res.end('{message : "The Database' + BddPath + 'does not exist !"}');
    }else{
      if (!tablePath) {
        delete eval(BddPath + "_schemas");
        delete eval(BddPath + "_datas");
        fs.unlinkSync("./bddFiles/schemas/" + BddPath + "_schemas.json");
        fs.unlinkSync("./bddFiles/datas/" + BddPath + "_datas.json");
        var index = listBDD["bdd"].indexOf(BddPath);
        listBDD["bdd"].splice(index, 1);
        change = true;
        res.end(
          `{message : "Database ` + BddPath + ` is correctly deleted !"}`
        );
      } else {
        // Partie permettant de supprimer une table
        if(tablePath.includes("/")){
          res.writeHead(404, { "Content-type": "application/json" });
          res.end('{message : "Not found"}');
        }else{
          if (!params) {
            if(eval(BddPath+"_datas")[tablePath]){
              var schemasFile = eval(BddPath + "_schemas");
              var datasFile = eval(BddPath + "_datas");
              delete schemasFile[tablePath];
              delete datasFile[tablePath];
              change = true;

              res.writeHead(200, { "Content-type": "application/json" });
              res.end('{message : "The table '+ tablePath +' was correctly deleted !"}');
            }else{
              res.writeHead(500, { "Content-type": "application/json" });
              res.end('{message : "The table '+ tablePath +' does not exist in the database '+ BddPath +'!"}');
            }
          } else {
            if (params["id"]) {
              var success = false;
              eval(BddPath + "_datas")[tablePath].map(function(e) {
                if(params["id"] == e.id) {
                    var index = eval(BddPath+'_datas')[tablePath].indexOf(e);
                    eval(BddPath+'_datas')[tablePath].splice(index, 1);
                    success = true;
                }
              });
              if(!success){
                res.writeHead(500, { "Content-type": "application/json" });
                res.end('{message : "The id informed does not match any of the '+ tablePath +' !"}');
              }else{
                change = true;
                res.writeHead(200, { "Content-type": "application/json" });
                res.end(JSON.stringify(eval(BddPath+'_datas')[tablePath]));
              }
            } else {
              res.writeHead(500, { "Content-type": "application/json" });
              res.end('{message : "An id of a '+ tablePath +' is required !"}');
            }
          }
        }
      }
    }
  } 
  // Partie permettant de gérer les requêtes de type OPTIONS
  else if (req.method == "OPTIONS") {
    res.writeHead(200);
    res.end()
  }
  // Partie permettant de gérer les requêtes dont le type n'est pas géré par notre serveur
  else {
    res.writeHead(404, { "Content-type": "ext/plain" });
    res.end("Not Found");
  }
};

var serveur = http.createServer(requestHandler);
serveur.listen(8000, () => {
  console.log("connected");
});
