"use strict";

const { ServiceBroker } = require("moleculer");
const DbService = require("moleculer-db");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const Sequelize = require("sequelize");
const HTTPServer = require("moleculer-web");

const brokerNode1 = new ServiceBroker({
    nodeID: "node-1",
    transporter: "NATS"
  });


  // Create the "gateway" service
brokerNode1.createService({
    // Define service name
    name: "gateway",
    // Load the HTTP server
    mixins: [HTTPServer],
  
    settings: {
      routes: [
        {
          aliases: {
            // When the "GET /products" request is made the "listProducts" action of "products" service is executed
            "GET /user": "posts.createUser",
            "GET /list" : "posts.listUser",
            "GET /update/" : "posts.updateUser",
            "GET /delete/" : "posts.deleteUser"

          },
        }
      ]
    },
    actions : {
        rest:{
            metrics:{
                params:({req,res}) => {
                    return {
                        http:{
                            method:req.method,
                            url:req.url,
                            statuscode:req.statuscode
                        }
                    };
                }
            }
        }
    }
  });

// Create the broker for node-2
// Define nodeID and set the communication bus
const brokerNode2 = new ServiceBroker({
    nodeID: "node-2",
    transporter: "NATS"
});



// Create a Sequelize service for `post` entities
brokerNode2.createService({
    name: "posts",
    mixins: [DbService],
    adapter: new SqlAdapter('mytest', 'postgres', 'ansab12345', {
        host: 'localhost',
        dialect: 'postgres',
    
        pool: {
            max: 5,
            min: 0,
            idle: 10000
        },
    
    }),
    model: {
        name: "post",
        define: {
            title: Sequelize.STRING,
            content: Sequelize.TEXT,
            votes: Sequelize.INTEGER,
            author: Sequelize.INTEGER,
            status: Sequelize.BOOLEAN
        },
        options: {
            // Options from http://docs.sequelizejs.com/manual/tutorial/models-definition.html
        }
    },
    actions : {
        createUser:{
            async handler() {
                const res = brokerNode2.call("posts.create", {
                    title: "My first post",
                    content: "Lorem ipsu...",
                    votes: 0
                })
                return res;
            }
        },
    listUser:{
        async handler() {
            const res = brokerNode2.call("posts.find")
            return res;
        }
    },
    updateUser:{
        params:{
            id:"string",
            name:"string"
        },
        async handler(ctx) {
            const res = brokerNode2.call("posts.update", { id: ctx.params.id, title: ctx.params.name })
            return res;
        }
    },
    deleteUser:{
        params:{
            id:"string"
        },
        async handler(ctx) {
            const res = brokerNode2.call("posts.remove", { id: ctx.params.id })
            return res;
        }
    }
}

});




Promise.all([brokerNode1.start(), brokerNode2.start()]);