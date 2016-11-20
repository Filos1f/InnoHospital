var fs 		= require('node-fs');
var config 		= require('../config');
var pg 			= require('pg');
var md5 		= require('js-md5');
var dataBase 	= require('../libs/dbManagement');
var async       = require('async');

function LoadStaffInformation(res, email, patientHandler) {	
	var results = [];
	var appointmentInfo = [];
	async.series([
		function(callback) {
			const client = dataBase.ConnectToDataBase();
			client.connect();
			console.log("FIRST CALLBACK!");
    		var sqlQuery = 
			'SELECT * from person \
			NATURAL JOIN employee \
			where email = \'' + email + '\'';
    		const query = client.query(sqlQuery);
    		query.on('row', function(row) {
    			console.log("FIRST QUERY!");
		    	results.push(row);
		    });  
		    query.on("end", function(result){
		    	callback();
		    	client.end();
		    });
		},
		function(callback) {
			const client = dataBase.ConnectToDataBase();
			client.connect();
			var sqlQuery = 'select v.day, v.starttime, per.firstname, per.secondname\
							from patient p\
							natural join visitschedule v \
							natural join person per \
							where idemp=\'' + results[0].idemp +'\''; 
			console.log(sqlQuery);

			const query = client.query(sqlQuery);
			query.on('row', function(row){
		    	appointmentInfo.push(row);
		    });
		    query.on("end", function(result){
		    	callback();
		    	client.end();
		    });
		},
		function(callback) {
			patientHandler(results, appointmentInfo);
		},
		],
		function(err) {
			if (err) return callback(err);
	    	console.log('Both finished!');
	});
}

exports.staffInfo = function(req,res){ //пилит федя
	//вывод информации о стафе
	console.log("-------------LOG Info-----------");
	res.render('staffMyInfo');
};

exports.staff = function(req, res) {
	console.log("------------- Staff init -----------");

	var analizesTitle = JSON.parse(fs.readFileSync("title_of_analizis", "utf8"));
	console.log("------------- Staff init 1-----------");

	var diagnosesType = JSON.parse(fs.readFileSync("type_of_diagnoses", "utf8"));
	console.log("------------- Staff init 2-----------");

	var analizesType = JSON.parse(fs.readFileSync("type_of_typeAnaliz", "utf8"));
	console.log("------------- Staff init 3-----------");
	var EmployeePositionsId = JSON.parse(fs.readFileSync("types_of_id_employee", "utf8"));

	console.log("------------- Staff init 4-----------");
	var allStaff = JSON.parse(fs.readFileSync("Staff.txt", "utf8"));

	console.log("------------- Staff hash -----------");
	function hash(key)
	{
		var h = 0;

		for (p = 0; p != key.length; p++) {
			h = h * 31 + key.charAt(p);
		}
		return h;
	}
	console.log("------------- Staff position -----------");

    async.series([
       function(callback) {
           const db = dataBase.ConnectToDataBase();
           db.connect();

		   var query = db.query( 'Select * from employee');
		   const result = [];
		   query.on('rows', function(row) {
			   result.push(row);
		   });

		   query.on("end", function(result) {
			   if (result.rows[0] === undefined) {
				   for (var i = 0; i < EmployeePositionsId.length; ++i) {
					   console.log(i);
					   db.query(
						   'INSERT INTO positions(idPos, title) \
                           VALUES($1,$2)',
						   [EmployeePositionsId[i]['id'], EmployeePositionsId[i]['value']]
					   );
				   }

				   for(var y = 0; y < allStaff.length; y++)
				   {
					   db.query(
						   'INSERT INTO person(idPassport,firstName,secondName,address,email,telN,birthDay,gender,hashPassword,hashSalt) \
                          	VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
							   [allStaff[y]['People']['idPassport'], allStaff[y]['People']['firstName'], allStaff[y]['People']['secondName'], 
							   allStaff[y]['People']['address'], allStaff[y]['People']['email'], allStaff[y]['People']['telN'],
							   allStaff[y]['People']['birthday'], allStaff[y]['People']['gender'],
							   md5(allStaff[y]['People']['password'] + hash(allStaff[y]['People']['idPassport'])),
							   hash(allStaff[y]['People']['idPassport'])]);

					   db.query(
						   'INSERT INTO Employee(rating,idPos,idEmp,roomN,idPassport) \
						   	VALUES($1,$2,$3,$4,$5)',
							   	['0', allStaff[y]['People']['Employee']['idPos'], allStaff[y]['People']['Employee']['idEmp'],
								allStaff[y]['People']['Employee']['roomN'], allStaff[y]['People']['idPassport']]
					   );

					   db.query(
						   'INSERT INTO WorkingSchedule(roomN,startTime, finishTime, day) \
                          	VALUES($1,$2,$3,$4)',
							   [allStaff[y]['People']['Employee']['WorkingSchedule']['roomN'],
							   allStaff[y]['People']['Employee']['WorkingSchedule']['startTime'],
							   allStaff[y]['People']['Employee']['WorkingSchedule']['finishTime'],
							   allStaff[y]['People']['Employee']['WorkingSchedule']['date']]
					   );

				   }
				   for(var k = 0; k < analizesType.length; ++k)
				   {
					   console.log(k);
					   db.query(
						   'INSERT INTO conclusiontypes(idtype, title) \
                               VALUES($1,$2)',
						   [analizesType[k]['id'], analizesType[k]['value']]
					   );
				   }
				   for(var m = 0; m < analizesTitle.length; ++m) {
					   for (var j = 0; j < analizesTitle[m]['value'].length; ++j) {
						   console.log(analizesTitle[m]['value'][j]['id'] + " " + analizesTitle[m]['value'][j]['title'] + " " + analizesTitle[m]['idType']);
						   db.query(
							   'INSERT INTO generalizedAnalysisTitles(idtitle, title, idType) \
                VALUES($1,$2, $3)',
							   [analizesTitle[m]['value'][j]['id'], analizesTitle[m]['value'][j]['title'], analizesTitle[m]['idType']]);
					   }
				   }
				   for(var t = 0; t < diagnosesType.length; t++)
				   {
					   var id = (t + 1) * 999;
					   db.query(
						   'INSERT INTO DiagnosisInfo(title, idtitle, nationalcode, rate) \
                          VALUES($1,$2, $3, $4)',
						   [diagnosesType[t]['value'], id, diagnosesType[t]['id'], '0']);
				   }
			   }
		   });
       }
    ], function (err) {
        if(err) callback(err);
    });

	res.render('staff');
};

exports.Input_information_for_patient = function(req,res){	
	res.render('Input_information_for_patient');
	//при нажатии на апоимент
};

exports.staffMain = function(req,res) { //Fedy
	console.log("-------------Staff Cabinet-----------");
	//все апойманты на сегодня
};

exports.declineAppointment = function(req, res) {
	const client = dataBase.ConnectToDataBase();
	client.connect();

	//client.query('DELETE FROM visitschedule WHERE ');
};

exports.submitAD = function(req, res) {
	console.log(req.body.Description);
	console.log(req.body.Diagnosis);
}

exports.submitScans = function(req, res) {
	console.log(req.body.date);
	console.log(req.body.title);
	console.log(req.body.result);
}

exports.submitLabResult = function(req, res) {
	console.log(req.body.type);
	console.log(req.body.standart);
	console.log(req.body.result);
}

/*Авторизация врача*/
exports.signinStaff = function (req, res) {
	console.log("-------------LOG signinStaff-----------");
	sess = req.session;
	sess.email = req.body.email;

	const staff = dataBase.ConnectToDataBase();
	staff.connect();
	console.log(req.body.hashpassword);
	var sqlQuery =
		'SELECT * from person \
        NATURAL JOIN employee \
        where email = \'' + req.body.email + '\'';

	const query = staff.query(sqlQuery);
	console.log(sqlQuery);

	const result = [];
	query.on('rows', function(row) {
		console.log("------!!!!!!!!!--------" + row);
		result.push(row);
	});
	console.log(sqlQuery);

	query.on("end", function(result){
		if(result.rows[0] === undefined){
				res.render('staff');
		} else {
			var hashsalt = result.rows[0].hashsalt;
			if(md5(req.body.hashpassword + hashsalt) == result.rows[0].hashpassword) {
				LoadStaffInformation(res, sess.email, function(results, appointmentInfo) {
					console.log(appointmentInfo);
					res.render('staffMain', {patientappointment:appointmentInfo});
				});
				
			}
			else {
				console.log("error2");
				res.render('staff');
			}
		}
		staff.end();
    });
};