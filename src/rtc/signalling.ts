export interface AwEvent {}

export interface AwEventFromPeer extends AwEvent {
    peerId: string;
}

export interface AwOfferEvent extends AwEventFromPeer {
    offer: RTCSessionDescription;
}

export interface AwAnswerEvent extends AwEventFromPeer {
    answer: RTCSessionDescription;
}

export interface AwNewCandidateEvent extends AwEventFromPeer {
    iceCandidate: RTCIceCandidate;
}

export interface AwPeerListEvent extends AwEvent {
    peerList: string[];
}

export type AwEventHandler<T> = (event: T) => void;

export interface Signalling {
    registerPeer (peerId: string): void;
    sendOfferToRemotePeer (peerId: string, offer: RTCSessionDescriptionInit): void;
    sendAnswerToRemotePeer (peerId: string, answer: RTCSessionDescriptionInit): void;
    sendNewCandidateToRemotePeer (peerId: string, candidate: RTCIceCandidate): void;

    on (eventName: 'offer', handlerCallback: AwEventHandler<AwOfferEvent>): void;
    on (eventName: 'answer', handlerCallback: AwEventHandler<AwAnswerEvent>): void;
    on (eventName: 'newCandidate', handlerCallback: AwEventHandler<AwNewCandidateEvent>): void;
    on (eventName: 'peerList', handlerCallback: AwEventHandler<AwPeerListEvent>): void;
}
