import { Signalling, AwPeerListEvent, AwOfferEvent, AwAnswerEvent, AwNewCandidateEvent } from './signalling';
import { Peer } from './peer';

export class AwRTC {
    private rtcConfiguration: RTCConfiguration = {};
    private peers: { [peerId: string]: Peer }
    private localMediaStream: MediaStream;
    private localMediaConstraints: MediaStreamConstraints = { 
        audio: true, 
        video: false
    }

    constructor (private currentUserId: string, private signalling: Signalling) {
        this.peers = {};
        this.registerSignallingEventHandlers();
    }

    public async initialize (): Promise<void> {        
        await this.negotiateMediaStream();
        this.signalling.registerPeer(this.currentUserId);
    }

    public async shareScreen (): Promise<void> {
        this.localMediaConstraints.video = <any>{
            mediaSource: 'window'
        };
        await this.negotiateMediaStream();
        this.replacePeersMediaStream();
    }

    public async stopSharingScreen (): Promise<void> {
        if (this.localMediaConstraints.video === false) {
            return;
        }
        this.localMediaConstraints.video = false;
        await this.negotiateMediaStream();
        this.replacePeersMediaStream();
    }

    private async negotiateMediaStream (): Promise<void> {
        this.localMediaStream = await this.getLocalMediaStream();
        this.assignMediaStreamToPageElements(this.localMediaStream);
    }

    private replacePeersMediaStream () {
        Object.keys(this.peers).forEach((peerId: string) => {
            this.peers[peerId].clearMediaStream();
            this.peers[peerId].addMediaStream(this.localMediaStream);
        });
    }    

    private registerSignallingEventHandlers () {
        this.signalling.on('peerList', (event: AwPeerListEvent) => this.connectToPeers(event.peerList));
        this.signalling.on('offer', (event: AwOfferEvent) => this.acceptOfferFromRemotePeer(event.peerId, event.offer));
        this.signalling.on('answer', (event: AwAnswerEvent) => this.acceptAnswerFromRemotePeer(event.peerId, event.answer));
        this.signalling.on('newCandidate', (event: AwNewCandidateEvent) => this.acceptNewCandidateFromRemotePeer(event.peerId, event.iceCandidate));
    }

    private getLocalMediaStream (): Promise<MediaStream> {
        return navigator.mediaDevices.getUserMedia(this.localMediaConstraints);
    }

    private assignMediaStreamToPageElements (localMediaStream: MediaStream): void {
        const localAudioElement = this.getAudioElementForUserId(this.currentUserId);
        const localVideoElement = this.getVideoElementForUserId(this.currentUserId);
        localAudioElement.srcObject = localMediaStream;
        localVideoElement.srcObject = localMediaStream;
    }

    private getAudioElementForUserId (userId: string): HTMLAudioElement {
        return <HTMLAudioElement>document.querySelector('audio.id-' + userId);
    }
    private getVideoElementForUserId (userId: string): HTMLVideoElement {
        return <HTMLVideoElement>document.querySelector('video.id-' + userId);
    }
    
    private connectToPeers (peerList: string[]): void {
        peerList.forEach(async (peerId: string) => {
            if (peerId === this.currentUserId) return;
            this.peers[peerId] = this.instantiatePeer(peerId);
            this.peers[peerId].addMediaStream(this.localMediaStream);
            this.peers[peerId].initializeDataChannel();
        });
    }

    private async acceptOfferFromRemotePeer (peerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
        if (!this.peers[peerId]) {
            this.peers[peerId] = this.instantiatePeer(peerId);
            this.peers[peerId].addMediaStream(this.localMediaStream);
        }
        this.peers[peerId].receiveOffer(offer);
    }

    private instantiatePeer (peerId: string): Peer {
        const mediaElements = {
            audio: this.getAudioElementForUserId(peerId),
            video: this.getVideoElementForUserId(peerId)
        };
        return new Peer(peerId, this.rtcConfiguration, mediaElements, this.signalling);
    }

    private acceptAnswerFromRemotePeer (peerId: string, answer: RTCSessionDescriptionInit): void {
        this.peers[peerId].receiveAnswer(answer);
    }

    private acceptNewCandidateFromRemotePeer (peerId: string, iceCandidate: RTCIceCandidate): void {
        this.peers[peerId].receiveNewCandidate(iceCandidate);
    }
    
}