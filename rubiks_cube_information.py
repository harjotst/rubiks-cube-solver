import json

class RubiksCubeInformation:
    def __init__(self):
        self.corner_orientations = json.load(open('./precompute/corner-orientations-for-corner-type-and-position.json'))
        self.corner_indices = json.load(open('./precompute/corner-positions-to-indices.json'))
        self.corner_product_to_type = json.load(open('./precompute/corner-face-product-to-type.json'))
        self.edge_orientations = json.load(open('./precompute/edge-orientations-for-edge-type-and-position.json'))
        self.edge_face_product_to_type = json.load(open('./precompute/edge-face-product-to-type.json'))
        self.edge_positions_to_indices = json.load(open('./precompute/edge-positions-to-indices.json'))
        self.opposite_moves = json.load(open('./precompute/opposite-moves.json'))