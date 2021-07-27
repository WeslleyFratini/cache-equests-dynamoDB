const AWS = require("aws-sdk");

const patientRepository = require("./repository/patient");
const examRepository = require("./repository/exam");
const medicineRepository = require("./repository/medicine");

AWS.config.update({
  region: "us-east-1",
});

const dynamoClient = new AWS.DynamoDB.DocumentClient();
const dynamoPatientsTables = "patients";

const addPatientsToCache = (patients) => {
  const now = Math.round(new Date().getTime() / 1000);
  const params = {
    TableName: dynamoPatientsTables,
    Item: {...patients, expiresAt: now + 3600 }
  };

  return dynamoClient.put(params).promise();
};

const getPatientFromCache = patientId => {
  const params = {
    TableName: dynamoPatientsTables,
    Key: {
      id: Number(patientId),
    },
  };
  return dynamoClient
    .get(params)
    .promise()
    .then((result) => result.Item)
    .catch((e) => {
      console.log(e);
      return;
    });
};

const getPatientInfo = async patientId => {
  let patientData = await getPatientFromCache(patientId)

  if (patientData) {
    console.log("Vim do cache");
    return patientData;
  }

  const patient = await patientRepository.findById(patientId);
  const exams = await examRepository.findAllByPatientId(patientId);
  const medicines = await medicineRepository.findAllByPatientId(patientId);

  patientData = {
    ...patient.dataValues,
    createdAt: patient.createdAt.toISOString(),
    updatedAt: patient.updatedAt.toISOString(),
    exams: exams.map((exam) => ({
      name: exam.name,
      result: exam.result,
      date: exam.date.toISOString(),
    })),
    medicines: medicines.map((medicine) => ({
      name: medicine.name,
      date: medicine.date.toISOString(),
    })),
  };

  await addPatientsToCache(patientData);

  console.log("Vim do banco");

  return patientData;
};

module.exports = {
  getPatientInfo,
};
