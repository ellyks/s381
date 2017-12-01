var express = require('express');
var app = express();
var session = require('cookie-session');
var fileUpload = require('express-fileupload');
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var assert = require('assert');
var ExifImage = require('exif').ExifImage;
var fs = require('fs');
var mongourl = 'mongodb://project:project381@ds137054.mlab.com:37054/s381f';


app = express();
app.set('view engine','ejs');

var SECRETKEY1 = 'I want to pass COMPS381F';
var SECRETKEY2 = 'Keep this to yourself';
var db;
var users = new Array(
	{name: 'demo', password: ''},
	{name: 'demo2', password: ''},
	{name: 'raymondso', password: ''}
	);

app.set('view engine','ejs');


app.use(session({
  name: 'session',
  keys: [SECRETKEY1,SECRETKEY2]
}));

app.use(fileUpload());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/',function(req,res) {
	console.log(req.session);
	if (!req.session.authenticated) {
		res.redirect('/login');
	} else {
		res.status(200);
		MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		var cursor = db.collection('restaurants').find().toArray(function(err, results) {
		//console.log(results)
		// send HTML file populated with quotes here
		res.render('secrets',{r:results,name:req.session.username});
})
		
	});
	}
});

app.get('/login',function(req,res) {
	res.sendFile(__dirname + '/public/login.html');
});

app.get('/new', function(req,res) {
	res.status(200).render('new');

});

app.post('/new', function(req,res) {
		create(req,res,req.body);
		
});


app.post('/login',function(req,res) {
	for (var i=0; i<users.length; i++) {
		if (users[i].name == req.body.name &&
		    users[i].password == req.body.password) {
			req.session.authenticated = true;
			req.session.username = users[i].name;
		}
	}
	res.redirect('/');
});

app.get('/logout',function(req,res) {
	req.session = null;
	res.redirect('/');
});

app.get('/display', function(req,res) {
		MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		var cursor = db.collection('restaurants').find().toArray(function(err, results) {
		//console.log(results);
		// send HTML file populated with quotes here
		if (req.query.id) {
		for (i in results) {
			if (results[i]._id == req.query.id) {
				results = results[i];
				break;
			}
		}
		if (results) {
			res.render('display', {r: results});							
		} else {
			res.status(500).end(req.query.id + ' not found!');
		}
	} else {
		res.status(500).end('id missing!');
	}
	});
});
});

app.get('/remove',function(req,res) {
	MongoClient.connect(mongourl,function(err,db) {
		if (err) throw err;
    var criteria = {};
    criteria['_id'] = ObjectID(req.query.id);
	console.log(criteria);
	var cursor = db.collection('restaurants').find().toArray(function(err, results) {
				if (req.query.id) {
		for (i in results) {
			if (results[i]._id == req.query.id) {
				results = results[i];
				break;
			}
		}
		}
		if(results.owner!=req.session.username){
			res.end('You are not the owner, cannot delete!');
		}
		else{
		db.collection("restaurants").deleteOne(criteria, function(err, obj) {
		if (err) throw err;
		console.log("1 document deleted");
		res.render('remove');	
		});	
		}
		});							
  });
});


app.get('/rate',function(req,res) {
	MongoClient.connect(mongourl,function(err,db) {
		if (err) throw err;
	var cursor = db.collection('restaurants').find().toArray(function(err, results) {
	var criteria = {};
    criteria['_id'] = ObjectID(req.query.id);
	console.log(criteria);
		if (req.query.id) {
		for (i in results) {
			if (results[i]._id == req.query.id) {
				results = results[i];
				break;
			}
		}
		}
				results.grades.forEach(function(rate){
				if(rate.user==req.session.username)
					res.end('Rated before!!!!!!');
				});
		
	res.render('rate',{r: results});
	});	
});	
});


app.post('/rate',function(req,res) {
	var new_rate={};
	new_rate['user']=req.session.username;
	new_rate['score']=req.body.rate;
	MongoClient.connect(mongourl,function(err,db) {
	var criteria = {};
    criteria['_id'] = ObjectID(req.query.id);
	assert.equal(err,null);
	console.log('Connected to MongoDB\n');
	console.log(new_rate);
	console.log(criteria);
		db.collection('restaurants').updateOne(criteria,{$push:{grades:{$each:[new_rate]}}},function(err) {
    if (err) throw err;
    console.log("Rated");
		res.redirect('/');							
	});
	});
});

app.get('/edit', function(req,res) {
	MongoClient.connect(mongourl,function(err,db) {
	if (err) throw err;
	var cursor = db.collection('restaurants').find().toArray(function(err, results) {
	var criteria = {};
    criteria['_id'] = ObjectID(req.query.id);
	console.log(criteria);
		if (req.query.id) {
		for (i in results) {
			if (results[i]._id == req.query.id) {
				results = results[i];
				break;
			}
		}
		}
			if(results.owner!=req.session.username){
				res.end('You are not the owner, cannot edit!');
			}
	res.render("edit",{r: results});
	});	
	});
      
   });


app.post("/edit", function(req,res) {
		update(req,res,req.body,ObjectID(req.query.id));
});


app.get('/map', function(req,res) {
  res.render('map.ejs',
             {lat:req.query.lat,lon:req.query.lon});
});

app.get('/search', function(req,res) {
	MongoClient.connect(mongourl,function(err,db) {
	if (err) throw err;
		var the_name=[];
	    var the_borough =[];
	    var the_cuisine =[];
	
	db.collection('restaurants').distinct("name", function(err,result) {
		console.log(result);
		the_name=result;
		db.collection('restaurants').distinct("borough", function(err,result) {
		console.log(result);
		the_borough=result;
		db.collection('restaurants').distinct("cuisine", function(err,result) {
		console.log(result);
		the_cuisine=result;
	res.render("search",{n:the_name,b:the_borough,c:the_cuisine});
	});
	});
	});
	});
});

app.get('/searching',function(req,res) {
	MongoClient.connect(mongourl,function(err,db) {
	if (err) throw err;
	
	console.log(req.query);
	
	var criteria = {};
	if(req.query.name!="")
    criteria['name'] = req.query.name;

	if(req.query.borough!="")
    criteria['borough'] = req.query.borough;

	if(req.query.cuisine!="")
    criteria['cuisine'] = req.query.cuisine;

	console.log(criteria);
	
	findRestaurants(db,criteria,function(restaurants) {
			db.close();
			if(restaurants.length==0){
				res.end('No result');
			}
			else{
			res.render('result',{r: restaurants});}
		});
});
});


function insertRestaurant(db,r,callback) {
	db.collection('restaurants').insertOne(r,function(err,result) {
		assert.equal(err,null);
		console.log("Insert was successful!");
		console.log(JSON.stringify(result));
		callback(result);
	});
}

function create(req,res,queryAsObject) {
	var new_r = {};	// document to be inserted
	if (queryAsObject.name) new_r['name'] = queryAsObject.name;
	if (queryAsObject.owner) new_r['owner'] = req.session.username;
	if (queryAsObject.borough) new_r['borough'] = queryAsObject.borough;
	if (queryAsObject.cuisine) new_r['cuisine'] = queryAsObject.cuisine;
	//if (queryAsObject.name) new_r['rating'] = queryAsObject.rating;
	var address = {};
	if (queryAsObject.building || queryAsObject.street|| queryAsObject.zipcode|| queryAsObject.lat|| queryAsObject.lon) {
		if (queryAsObject.zipcode) address['zipcode'] = queryAsObject.zipcode;
		if (queryAsObject.lat) address['lat'] = queryAsObject.lat;
	  if (queryAsObject.lon) address['lon'] = queryAsObject.lon;
		if (queryAsObject.building) address['building'] = queryAsObject.building;
		if (queryAsObject.street) address['street'] = queryAsObject.street;
	}
	new_r['address'] = address;
	new_r['grades']=[];
	new_r['owner'] = req.session.username;
	
	if(req.files.photo){
	var filename = req.files.photo.name;
	var mimetype = req.files.photo.mimetype;
	var image = {};
	image['image'] = filename;
		}
	console.log('About to insert: ' + JSON.stringify(new_r));
	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		if(req.files.photo){
		new_r['mimetype']=mimetype;
		new_r['image'] = req.files.photo.data.toString('base64');
		}
		insertRestaurant(db,new_r,function(result) {
			db.close();
			console.log(JSON.stringify(result));
			res.writeHead(200, {"Content-Type": "text/plain"});
			res.end("\ninsert was successful!");	
			
		});
	});
}



function update(req,res,queryAsObject,targetID) {
	var target = {_id:targetID};
	console.log("id:"+target);
	var new_r = {};	// document to be inserted
	if (queryAsObject.name) new_r['name'] = queryAsObject.name;
	if (queryAsObject.borough) new_r['borough'] = queryAsObject.borough;
	if (queryAsObject.cuisine) new_r['cuisine'] = queryAsObject.cuisine;
	if (queryAsObject.zipcode) new_r['zipcode'] = queryAsObject.zipcode;
	if (queryAsObject.lat) new_r['lat'] = queryAsObject.lat;
	if (queryAsObject.lon) new_r['lon'] = queryAsObject.lon;
	var address = {};
	if (queryAsObject.building || queryAsObject.street|| queryAsObject.zipcode|| queryAsObject.lat|| queryAsObject.lon) {
		if (queryAsObject.zipcode) address['zipcode'] = queryAsObject.zipcode;
		if (queryAsObject.lat) address['lat'] = queryAsObject.lat;
	  if (queryAsObject.lon) address['lon'] = queryAsObject.lon;
		if (queryAsObject.building) address['building'] = queryAsObject.building;
		if (queryAsObject.street) address['street'] = queryAsObject.street;
	}
	new_r['address'] = address;
	new_r['owner'] = req.session.username;
	if(req.files.photo){
	var filename = req.files.photo.name;
	var mimetype = req.files.photo.mimetype;
	var image = {};
	image['image'] = filename;
	}
	console.log('About to insert: ' + JSON.stringify(new_r));
	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		if(req.files.photo){
		new_r['mimetype']=mimetype;
		new_r['image'] = req.files.photo.data.toString('base64');}
		updateRestaurant(db,target,new_r,function(result) {
			db.close();
			console.log(JSON.stringify(result));
			res.writeHead(200, {"Content-Type": "text/plain"});
			res.end("\nupdate was successful!");			
		});
	});
}

function updateRestaurant(db,criteria,newValues,callback) {
	db.collection('restaurants').updateOne(
		criteria,{$set: newValues},function(err,result) {
			assert.equal(err,null);
			console.log("update was successfully");
			callback(result);
	});
}

function findRestaurants(db,criteria,callback) {
	var restaurants = [];
	cursor = db.collection('restaurants').find(criteria,{image:0}); 		
	cursor.each(function(err, doc) {
		assert.equal(err, null); 
		if (doc != null) {
			restaurants.push(doc);
		} else {
			callback(restaurants); 
		}
	});
}


app.listen(process.env.PORT || 8099);