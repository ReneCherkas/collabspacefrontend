import SockJS from "sockjs-client";
import Stomp from "stompjs";

const socket = new SockJS("http://localhost:8080/ws");
const stompClient = Stomp.over(socket);

stompClient.connect({}, () => {
    console.log("Connected to WebSocket");

    stompClient.subscribe("/topic/messages", (message) => {
        const receivedMessage = JSON.parse(message.body);
        console.log("New message:", receivedMessage);
    });
});

export function sendMessage(sender, content) {
    const message = {
        sender,
        content,
        timestamp: new Date().toISOString(),
    };
    stompClient.send("/app/chat.send", {}, JSON.stringify(message));
}
