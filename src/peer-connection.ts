export class PeerConnection {

    private assignPeerMediaStreamToPageElements (RTCTrackEvent: RTCTrackEvent, peerId: string): void {
        switch (RTCTrackEvent.track.kind) {
            case 'audio':
                const peerAudioElement = <HTMLAudioElement>document.querySelector('audio.id-' + peerId);
                peerAudioElement.srcObject = RTCTrackEvent.streams[0];
                break;
            case 'video':
                const peerVideoElement = <HTMLVideoElement>document.querySelector('video.id-' + peerId);
                peerVideoElement.srcObject = RTCTrackEvent.streams[0];
        }
    }

    private async connectToPeerAndSendOffer (peerId: string): Promise<void> {
        this.peerConnections[peerId] = this.createRTCPeerConnection(peerId);
        const offer = await this.createOffer(this.peerConnections[peerId]);
        this.signalling.sendOfferToRemotePeer(peerId, offer);
        this.log('sending offer', offer);
    }
    private createRTCPeerConnection (peerId: string): RTCPeerConnection {
        const peerConnection = new RTCPeerConnection(this.configuration);
        peerConnection.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => this.onIceCandidateEvent(event, peerId));
        peerConnection.addEventListener('iceconnectionstatechange', () => {});
        peerConnection.addEventListener('datachannel', (event: RTCDataChannelEvent) => this.initializeDataChannelEventHandlers(event.channel, peerId));
        peerConnection.addEventListener('track', (event: RTCTrackEvent) => this.assignPeerMediaStreamToPageElements(event, peerId));
        this.localMediaStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, this.localMediaStream);
        });
        this.createDataChannel(peerConnection, peerId);
        return peerConnection;
    }
    private onIceCandidateEvent (event: RTCPeerConnectionIceEvent, peerId: string): void {
        const iceCandidate = event.candidate;
        if (iceCandidate) {
            this.signalling.sendNewCandidateToRemotePeer(peerId, iceCandidate);
            this.log('sending new candidate', iceCandidate, 'to', peerId);
        }
    }

    async createOffer (peerConnection: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
        const rtcSessionDescriptionInit = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(rtcSessionDescriptionInit);
        return rtcSessionDescriptionInit;
    }

    async acceptOfferFromRemotePeer (peerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
        this.log('accepting offer', offer, 'from', peerId);
        this.peerConnections[peerId] = this.createRTCPeerConnection(peerId);
        this.peerConnections[peerId].setRemoteDescription(offer);

        const answer = await this.createAnswer(this.peerConnections[peerId]);
        this.signalling.sendAnswerToRemotePeer(peerId, answer);
        this.log('sending answer', answer, 'to', peerId);
    }

    async createAnswer (peerConnection: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        return answer;
    }

    private acceptAnswerFromRemotePeer (peerId: string, answer: RTCSessionDescriptionInit): void {
        this.log('accepting answer', answer, 'from', peerId);
        this.peerConnections[peerId].setRemoteDescription(answer);
    }

    private acceptNewCandidateFromRemotePeer (peerId: string, iceCandidate: RTCIceCandidate): void {
        this.log('accepting new candidate', iceCandidate, 'from', peerId);
        const newIceCandidate = new RTCIceCandidate(iceCandidate);
        this.peerConnections[peerId].addIceCandidate(newIceCandidate);
    }

    private createDataChannel (peerConnection: RTCPeerConnection, peerId: string): void {
        const dataChannelOptions = {
            ordered: false,
            maxPacketLifeTime: 3000
        };
        const dataChannel = peerConnection.createDataChannel('datastuffs', dataChannelOptions);
        this.initializeDataChannelEventHandlers(dataChannel, peerId);
    }

    private initializeDataChannelEventHandlers (dataChannel: RTCDataChannel, peerId: string): void {
        dataChannel.onerror = (error: RTCErrorEvent) => console.log("Data Channel Error:", error, 'from', peerId);
        dataChannel.onmessage = (event: MessageEvent) => this.onDataMessageEvent(event, peerId);        
        dataChannel.onopen = (event: RTCDataChannelEvent) => this.onDataChannelOpen(event, dataChannel, peerId);
        
        dataChannel.onclose = () => {
            console.log("The Data Channel is Closed");
        };
    }

    private onDataChannelOpen (event: RTCDataChannelEvent, dataChannel: RTCDataChannel, peerId: string): void {
        /*
        window.wasmSendBlock = (block) => dataChannel.send({ block: block });
        window.wasmSendTransaction = (transaction) => dataChannel.send({ transaction: transaction });
        */
        dataChannel.send('Hello World! to' + peerId);
    }

    private onDataMessageEvent (event: MessageEvent, peerId: string): void {
        /*if (event.data.block) {
            const block = event.data.block;
            console.log('received BLOCK', block);
            //receiveBlock(block);
        } else if (event.data.transaction) {
            const transaction = event.data.block;
            receiveTransaction(transaction);
        }*/
        console.log("Got Data Channel Message:", event.data, 'from', peerId, 'my currentUserId is: ', this.currentUserId);
    }

    private log (...any): void {
        console.log(this.currentUserId + ':', ...arguments);
    }
}