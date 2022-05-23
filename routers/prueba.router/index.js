const dispositivo = require("./models/dispositivos");
const logs = require("./models/logs");
const clientMqtt = require("../../storage/mqtt");
const options = clientMqtt.MQTTOptions;
var arrayTopicsListen = ["/#"];
var arrayTopicsServer = ["/bustos/", "/Leopoldo/"];


clientMqtt.on("connect", async function () {
    //BUSCO TODOS LOS NODOS NO REPETIDOS
    const buscarAllnodos = await dispositivo.find().distinct("nodoId");
    for (var nodo in buscarAllnodos) {
        arrayTopicsListen.push(buscarAllnodos[nodo].topic);
        arrayTopicsServer.push(buscarAllnodos[nodo].topicSrvResponse);
    }
    //	process.env.ARRAYTOPICOS=arrayTopics;
    //	process.env.ARRAYTOPICOS_SRV=arrayT_srv;

    clientMqtt.subscribe(arrayTopicsListen, options, () => {
        console.log("Subscribed to topics: ");
        console.log(arrayTopicsListen);
    });
    //console.log(arrayTopicsServer);
    for (var elemento in arrayTopicsServer) {
        //console.log("MQTT: " + elemento);
        const mensaje = {
            dispositivoId: elemento,
            nombre: "ESP32_TEMP_NODEjs",
            ubicacion: "Terraza",
            logId: 1,
            ts: new Date().getTime(),
            luz1: 0,
            luz2: 0,
            temperatura: 16,
            humedad: 80,
            nodoId: 0,
        };
        const payload = JSON.stringify(mensaje);
        // Publico mensajes al inicio del servicio para verificar la subscripción
        clientMqtt.publish(arrayTopicsServer[elemento], payload, options, (error) => {
            if (error) {
                console.log(error);
            }
        })
    }
    clientMqtt.on("message", async (topic, payload) => {
        console.log("[MQTT] Mensaje recibido: " + topic + ": " + payload.toString());
        var mensaje = payload.toString();
        const jason = JSON.parse(mensaje);
        // busco coincidencia de topic y nombre de dispositivo en la DB
        const buscarDispositivo = await dispositivo.findOne({
            topic: topic,
            nombre: jason.nombre,
        });

        if (buscarDispositivo) { // Si el dispositivo existe agrego un log
            var eltime = new Date().getTime();
            var elnodo = buscarDispositivo.dispositivoId;
            //console.log("[LOG] Nodo: " + elnodo);
            const id = await logs.find().sort({ "logId": -1 }).limit(1); // para obtener el maximo
            console.log("[LOG] id: " + id);
            const elLog = new logs({
                logId: (id?.find(x => x?.logId)?.logId) || 0 + 1,
                ts: eltime,
                eluz1: jason.luz1,
                eluz2: jason.luz2,
                etemperatura: jason.temperatura,
                ehumedad: jason.humedad,
                nodoId: elnodo
            });
            //console.log(elLog);
            try {
                const savedLog = await elLog.save();
                console.log("REGISTRO DE LOG AGREGADO CORRECTAMENTE.");
            } catch (error) {
                console.log("ERROR UPDATING");
            }
            //ACTUALIZO Dispositivo EN MONGO
            await dispositivo.findOneAndUpdate(
                { dispositivoId: elnodo },
                {
                    luz1: jason.luz1,
                    luz2: jason.luz2,
                    temperatura: jason.temperatura,
                    humedad: jason.humedad
                }).then(book => {
                    console.log("DISPOSITIVO ACTUALIZADO.");
                }).catch(err => {
                    console.log("ERROR UPDATING");
                });
        } else { // Si no existe creo un nuevo dispositivo
            console.log("Nodo no registrarlo, procedo a crearlo.");
            console.log("Topic recibido: " + topic);
            console.log("Datos del nodo: ");
            console.log(jason);
            // agrego un nuevo nodo en mongo
            const nuevodisp = new dispositivo({
                dispositivoId: jason.dispositivoId,
                nombre: jason.nombre,
                ubicacion: jason.ubicacion,
                luz1: jason.luz1,
                luz2: jason.luz2,
                temperatura: jason.temperatura,
                humedad: jason.humedad,
                topic: topic,
                topicSrvResponse: topic
            });
            //console.log("NEWDISP: " + nuevodisp);
            //console.log("Dispositivo nuevo creado ok");
            try {
                const savedDisp = await nuevodisp.save();
                console.log("NUEVO NODO AGREGADO CORRECTAMENTE.");
            } catch (error) {
                console.log("ERROR UPDATING");
            }
            // Agrego el log del nodo creado
            var eltime = new Date().getTime();
            var elnodo = jason.dispositivoId;
            //console.log("[LOG] Nodo: " + elnodo);
            const id = await logs.find().sort({ "logId": -1 }).limit(1); // para obtener el maximo
            console.log("[LOG] id: " + id);
            const elLog = new logs({
                logId: (id?.find(x => x?.logId)?.logId) || 0 + 1,
                ts: eltime,
                eluz1: jason.luz1,
                eluz2: jason.luz2,
                etemperatura: jason.temperatura,
                ehumedad: jason.humedad,
                nodoId: elnodo
            });
            //console.log(elLog);
            try {
                const savedLog = await elLog.save();
                console.log("REGISTRO DE LOG AGREGADO CORRECTAMENTE.");
            } catch (error) {
                console.log("ERROR UPDATING");
            }
        }
    })

})

const register = (router) => {
    router.get("/status", (req, resp) => resp.json({ status: 200 }));

    router.get('/dispositivos', async function (req, res) {
        const listado = await dispositivo.find();
        if (!listado) return res.json({ data: null, error: 'No hay datos en la Base de Datos.' });
        if (listado) return res.json({ data: listado, error: null });
    });

    router.get('/dispositivos/:id', async function (req, res) {
        const listado = await dispositivo.findOne({ "_id": req.params.id });
        if (!listado) return res.json({ data: null, error: 'No hay datos en la Base de Datos.' });
        if (listado) return res.json({ data: listado, error: null });
    });

    return router;
};

module.exports = {
    register,
};
