import * as Phaser from 'phaser';
import {io} from "socket.io-client";
import Vector2 = Phaser.Math.Vector2;

let iceServers = {iceServers: [{urls: "stun:stun.l.google.com:19302"}]};

const socket = io("https://port-0-hammer-pong-3dwio2llk6btdcg.sel4.cloudtype.app/");
const room = new URLSearchParams(window.location.search).get("room");

let peerConnection!: RTCPeerConnection;
let dataChannel!: RTCDataChannel;

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(iceServers)

    peerConnection.addEventListener("icecandidate", (event) => {
        if (event.candidate) {
            socket.emit("message", {
                type: "candidate",
                candidate: event.candidate,
            });

            console.log("candidate send", event.candidate);
        }
    });

    socket.on("message", async (message) => {
        if (message.type === "candidate") {
            await peerConnection.addIceCandidate(message.candidate);
            console.log("candidate recv", message.candidate);
        }
    });

    dataChannel = peerConnection.createDataChannel("dataChannel");
    dataChannel.addEventListener("open", () => {
        console.log("dataChannel open");
    });
}

function createOffer() {
    socket.on("message", async (message) => {
        if (message.type === "join") {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            socket.emit("message", {
                type: "offer",
                offer: offer,
            });

            console.log("offer", offer);
        }

        if (message.type === "answer") {
            await peerConnection.setRemoteDescription(message.answer);
            console.log("answer", message.answer);
        }
    });

    peerConnection.addEventListener("datachannel", (event) => {
        dataChannel = event.channel;
        dataChannel.addEventListener("message", (event) => {
            console.log("dataChannel message", event.data);
        });
    });
}

function waitOffer() {
    socket.emit("message", {
        type: "join",
    });

    socket.on("message", async (message) => {
        if (message.type === "offer") {
            console.log("offer", message.offer);

            await peerConnection.setRemoteDescription(message.offer);

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            socket.emit("message", {
                type: "answer",
                answer: answer,
            });
            console.log("answer", answer);
        }
    });
}

socket.on("connect", async () => {
    console.log("connected");

    socket.emit("room", room);

    socket.on("userCount", async (userCount) => {
        console.log("userCount", userCount);

        createPeerConnection();

        if (userCount === 1) {
            createOffer();
        } else {
            waitOffer();
        }
    });
});

const ballSize = 5;

export class MainScene extends Phaser.Scene {
    fpsText!: Phaser.GameObjects.Text;
    player!: Phaser.GameObjects.Arc;

    constructor() {
        super();
    }

    async create() {
        this.physics.world.fixedStep = true;

        this.fpsText = this.add.text(10, 10, '', {font: '16px Courier', color: '#ffffff'});

        const playerBody = this.add.circle(400, 500, 15, 0xffffff);

        (this.physics.add.existing(playerBody).body as Phaser.Physics.Arcade.Body)
            .setCircle(15);

        const ball = this.add.circle(0, 0, ballSize, 0xffffff);
        (this.physics.add.existing(ball).body as Phaser.Physics.Arcade.Body)
            .setCircle(ballSize)
            // .setVelocity(200, 400)
            .setCollideWorldBounds(true);

        this.physics.add.collider(ball, playerBody);

        this.player = playerBody;

        if (!dataChannel) {
            await new Promise(resolve => {
                const interval = setInterval(() => {
                    if (dataChannel && dataChannel.readyState === "open") {
                        clearInterval(interval);
                        resolve(null);
                    }
                }, 100);
            });
        }

        console.log("readyState", dataChannel.readyState);

        dataChannel.addEventListener("message", (event) => {
            const data = JSON.parse(event.data);
            ball.setPosition(data.x, data.y);
        });
    }

    update() {
        this.fpsText.setText('FPS: ' + Math.round(this.game.loop.actualFps));

        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.input.activePointer.x, this.input.activePointer.y);
        if (distance < 5) {
            (this.player.body?.velocity as Vector2).setTo(0, 0);
            return;
        } else {
            this.physics.moveTo(this.player, this.input.activePointer.x, this.input.activePointer.y, Math.min(distance * 10));
        }

        if (!dataChannel || dataChannel.readyState !== "open") {
            return;
        }

        dataChannel.send(JSON.stringify({
            x: this.player.x,
            y: this.player.y,
        }));
    }
}