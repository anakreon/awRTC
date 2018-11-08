import { Signalling, AwPeerListEvent, AwOfferEvent, AwAnswerEvent, AwNewCandidateEvent } from './signalling';
import { Peer } from './peer';

export class AwRTC {
    private rtcConfiguration: RTCConfiguration = {};
    private peers: { [peerId: string]: Peer }

    constructor (private currentUserId: string, private signalling: Signalling) {
        this.peers = {};
        this.registerSignallingEventHandlers();
    }

    public async initialize (): Promise<void> {        
        const localMediaStream = await this.getLocalMediaStream();
        this.assignMediaStreamToPageElements(localMediaStream);
        this.signalling.registerPeer(this.currentUserId);
    }

    private registerSignallingEventHandlers () {
        this.signalling.on('peerList', (event: AwPeerListEvent) => this.connectToPeers(event.peerList));
        this.signalling.on('offer', (event: AwOfferEvent) => this.acceptOfferFromRemotePeer(event.peerId, event.offer));
        this.signalling.on('answer', (event: AwAnswerEvent) => this.acceptAnswerFromRemotePeer(event.peerId, event.answer));
        this.signalling.on('newCandidate', (event: AwNewCandidateEvent) => this.acceptNewCandidateFromRemotePeer(event.peerId, event.iceCandidate));
    }

    private getLocalMediaStream (): Promise<MediaStream> {
        const mediaConstraints = { 
            audio: true, 
            video: false/*{
                mediaSource: 'screen'
            }*/
        };
        return navigator.mediaDevices.getUserMedia(mediaConstraints);
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
            this.peers[peerId].sendOffer();
        });
    }

    private async acceptOfferFromRemotePeer (peerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
        this.peers[peerId] = this.peers[peerId] || this.instantiatePeer(peerId);
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