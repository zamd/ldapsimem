var ldap = require('ldapjs'),
    faker = require("faker"),
    bunyan = require('bunyan'),
    logger = bunyan.createLogger({
        name: "ldapdir",
        stream: process.stdout,
        level: 'trace'
    }),
    server = ldap.createServer({
        log: logger
    }),
    addrbooks = {}, userinfo = {},
    ldap_port = 1389,
    basedn = "cn=users, dc=bccoss, dc=com",
    company = "bccoss";

function getAll(max, cb){
    var contacts = [];

    for(var i=0;i<max;i++){
        var contact = {
            username: "user"+i,
            password: "demo",
            firstname: faker.name.firstName(),
            surname:   faker.name.lastName(),
            name: "user"+i,
            email: faker.internet.email()

            // username: faker.internet.userName(),
            // password: faker.internet.password(),
            // firstname: faker.name.firstName(),
            // surname:   faker.name.lastName(),
            // email: faker.internet.email()
            
        };
        contacts.push(contact);

    }
    contact = {
        username: "demo",
        password: "demo",
        firstname: "demo",
        email: "demo@bccoss.com",
        surname: "last",
    };
    contact.name = contact.firstname + " " + contact.surname;
    contacts.push(contact);

    cb(null, contacts);


}

getAll(100, function(err, contacts) {
  if (err) {
    console.log("Error fetching contacts", err);
    process.exit(1);
  }

  for (var i = 0; i < contacts.length; i++) {
    if (!addrbooks.hasOwnProperty(contacts[i].username)) {
      addrbooks[contacts[i].username] = [];
      userinfo["cn=" + contacts[i].username + ", " + basedn] = {
        abook: addrbooks[contacts[i].username],
        pwd: contacts[i].password
      };
    }
    var p = contacts[i].name.indexOf(" ");
    if (p != -1)
      contacts[i].firstname = contacts[i].name.substr(0, p);

    p = contacts[i].name.lastIndexOf(" ");
    if (p != -1)
      contacts[i].surname = contacts[i].name.substr(p + 1);

    var entry = {
      dn: "cn=" + contacts[i].name + ", " + basedn,
      attributes: {
        objectclass: [ "top" ],
        cn: contacts[i].name,
        mail: contacts[i].email,
        givenname: contacts[i].firstname,
        sn: contacts[i].surname,
        ou: company,
        samaccountname: contacts[i].username
      }
    };

    console.log(entry);
    addrbooks[contacts[i].username].push(entry);

  }

  server.bind(basedn, function (req, res, next) {
    var username = req.dn.toString(),
        password = req.credentials;

    if (!userinfo.hasOwnProperty(username) ||
         userinfo[username].pwd != password) {
      return next(new ldap.InvalidCredentialsError());
    }

    res.end();
    return next();
  });

 server.search("",function(req,res,next){
     console.log(req.dn.toString());
     res.end();
 })

  server.search(basedn, function(req, res, next) {

    //var binddn = req.connection.ldap.bindDN.toString();
    Object.keys(userinfo).forEach(k=>
    {
      for (var i = 0; i < userinfo[k].abook.length; i++) {
        if (req.filter.matches(userinfo[k].abook[i].attributes))
          res.send(userinfo[k].abook[i]);
      }
    });

    res.end();
  });

  server.listen(ldap_port, function() {
    console.log("Addressbook started at %s", server.url);
  });
});