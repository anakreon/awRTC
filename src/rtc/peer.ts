interface OutgoingSignalling {
    sendOfferToRemotePeer: (peerId: string, offer: RTCSessionDescriptionInit) => void;
    sendAnswerToRemotePeer: (peerId: string, answer: RTCSessionDescriptionInit) => void;
    sendNewCandidateToRemotePeer: (peerId: string, iceCandidate: RTCIceCandidate) => void;
}

type MediaElements = {
    audio: HTMLAudioElement;
    video: HTMLVideoElement;
}

export class Peer {    
    private peerConnection: RTCPeerConnection;
    private dataChannel: RTCDataChannel | undefined;

    constructor (private peerId: string, private rtcConfiguration: RTCConfiguration, private mediaElements: MediaElements, private signalling: OutgoingSignalling) {
        this.peerConnection = this.createRTCPeerConnection();
    }

    private createRTCPeerConnection (): RTCPeerConnection {
        const peerConnection = new RTCPeerConnection(this.rtcConfiguration);
        peerConnection.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => this.sendNewCandidateToRemotePeer(event));
        peerConnection.addEventListener('iceconnectionstatechange', () => {});
        peerConnection.addEventListener('datachannel', (event: RTCDataChannelEvent) => this.addDataChannelEventListeners(event.channel));
        peerConnection.addEventListener('track', (event: RTCTrackEvent) => this.assignMediaStreamToPageElements(event));
        return peerConnection;
    }

    public addInitiatorEventHandlers () {
        this.peerConnection.addEventListener('negotiationneeded', () => this.sendOffer());
    }
    
    public addMediaStream (mediaStream: MediaStream): void {
        mediaStream.getTracks().forEach((track: MediaStreamTrack) => {
            this.peerConnection.addTrack(track, mediaStream);
        });
    }
    
    private async sendOffer (): Promise<void> {
        const offer = await this.createOffer();
        this.signalling.sendOfferToRemotePeer(this.peerId, offer);
    }

    private async createOffer (): Promise<RTCSessionDescriptionInit> {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        return offer;
    }

    private async createAnswer (): Promise<RTCSessionDescriptionInit> {
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        return answer;
    }

    private sendNewCandidateToRemotePeer (event: RTCPeerConnectionIceEvent): void {
        const iceCandidate = event.candidate;
        if (iceCandidate) {
            this.signalling.sendNewCandidateToRemotePeer(this.peerId, iceCandidate);
        }
    }

    private assignMediaStreamToPageElements (RTCTrackEvent: RTCTrackEvent): void {
        switch (RTCTrackEvent.track.kind) {
            case 'audio':
                const peerAudioElement = this.mediaElements.audio;
                peerAudioElement.srcObject = RTCTrackEvent.streams[0];
                break;
            case 'video':
                const peerVideoElement = this.mediaElements.video;
                peerVideoElement.srcObject = RTCTrackEvent.streams[0];
        }
    }

    public initializeDataChannel (): void {
        const dataChannelInit = {
            ordered: false,
            maxPacketLifeTime: 3000
        };        
        this.dataChannel = this.createDataChannel('datastuffs', dataChannelInit);
    }
    
    private createDataChannel (channelName: string, dataChannelInit: RTCDataChannelInit): RTCDataChannel {
        const dataChannel = this.peerConnection.createDataChannel(channelName, dataChannelInit);
        this.addDataChannelEventListeners(dataChannel);
        return dataChannel;
    }
    private addDataChannelEventListeners (dataChannel: RTCDataChannel): void {
        dataChannel.addEventListener('error', (error: RTCErrorEvent) => console.log("Data Channel Error:", error, 'from'));
        dataChannel.addEventListener('message', (event: MessageEvent) => this.onDataMessageEvent(event));
        dataChannel.addEventListener('open', (event: Event) => this.onDataChannelOpen(event, dataChannel));
        dataChannel.addEventListener('close', () => console.log("The Data Channel is Closed"));
    }
    private onDataChannelOpen (event: Event, dataChannel: RTCDataChannel): void {
        dataChannel.send('Hello World! to' + this.peerId);
    }
    private onDataMessageEvent (event: MessageEvent): void {
        console.log("Got Data Channel Message:", event.data, 'from', this.peerId);
    }

    public async receiveOffer (offer: RTCSessionDescriptionInit): Promise<void> {
        this.peerConnection.setRemoteDescription(offer);

        const answer = await this.createAnswer();
        this.signalling.sendAnswerToRemotePeer(this.peerId, answer);
    }

    public receiveAnswer (answer: RTCSessionDescriptionInit): void {
        this.peerConnection.setRemoteDescription(answer);
    }
   
    public receiveNewCandidate (iceCandidate: RTCIceCandidate): void {
        this.peerConnection.addIceCandidate(iceCandidate);
    }
}